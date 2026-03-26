import { test, expect } from '../utils/webviewTestHarness.js';
import { MessageInjector } from '../utils/messageInjector.js';

test.describe('Rich Input Features', () => {
  test('should handle mixed text and multiple context tags correctly', async ({ webviewPage }) => {
    const injector = new MessageInjector(webviewPage);
    await injector.clearMessageLog();

    const messageInput = webviewPage.getByTestId('message-input');
    await messageInput.focus();

    // 1. Type some text
    await webviewPage.keyboard.type('Check these files: ');

    // 2. Insert first file tag
    let capturedRequestId = '';
    await webviewPage.exposeFunction('captureRequestId1', (message: any) => {
      if (message.command === 'requestFileSuggestions') {
        capturedRequestId = message.requestId;
      }
    });
    await webviewPage.evaluate(() => {
      window.addEventListener('vscode-message', (event: any) => {
        (window as any).captureRequestId1(event.detail);
      });
    });

    await webviewPage.keyboard.type('@file1');
    await webviewPage.waitForTimeout(500);
    await injector.simulateExtensionMessage('fileSuggestionsResponse', {
      suggestions: [{
        path: '/workspace/file1.ts',
        relativePath: 'file1.ts',
        name: 'file1.ts',
        extension: 'ts',
        icon: 'codicon-file',
        isDirectory: false
      }],
      filterText: 'file1',
      requestId: capturedRequestId
    });
    await webviewPage.waitForSelector('.suggestion-item', { state: 'visible' });
    await webviewPage.keyboard.press('Enter');

    // 3. Type more text
    await webviewPage.keyboard.type('and also ');

    // 4. Insert second file tag
    await webviewPage.keyboard.type('@file2');
    await webviewPage.waitForTimeout(500);
    await injector.simulateExtensionMessage('fileSuggestionsResponse', {
      suggestions: [{
        path: '/workspace/file2.ts',
        relativePath: 'file2.ts',
        name: 'file2.ts',
        extension: 'ts',
        icon: 'codicon-file',
        isDirectory: false
      }],
      filterText: 'file2',
      requestId: capturedRequestId // Reusing or wait for new one? Better wait for new one.
    });
    await webviewPage.waitForSelector('.suggestion-item', { state: 'visible' });
    await webviewPage.keyboard.press('Enter');

    // 5. Verify input content
    const tags = messageInput.locator('.context-tag');
    await expect(tags).toHaveCount(2);
    await expect(tags.nth(0)).toContainText('file1.ts');
    await expect(tags.nth(1)).toContainText('file2.ts');

    // 6. Send and verify markdown
    await webviewPage.evaluate(() => {
      (window as any).sentMessages = [];
      window.addEventListener('vscode-message', (event: any) => {
        if (event.detail.command === 'sendMessage') {
          (window as any).sentMessages.push(event.detail);
        }
      });
    });

    await webviewPage.getByTestId('send-btn').click();

    const sentMarkdown = await webviewPage.evaluate(() => {
      const msg = (window as any).sentMessages.find((m: any) => m.command === 'sendMessage');
      return msg ? msg.text : null;
    });

    // Note: \u00A0 is used for spaces after tags
    expect(sentMarkdown.replace(/\u00A0/g, ' ').trim()).toBe('Check these files: [@file:file1.ts] and also [@file:file2.ts]');
  });

  test('should allow deleting context tags with backspace', async ({ webviewPage }) => {
    const injector = new MessageInjector(webviewPage);
    await injector.clearMessageLog();

    const messageInput = webviewPage.getByTestId('message-input');
    await messageInput.focus();

    // Insert a tag
    let capturedRequestId = '';
    await webviewPage.exposeFunction('captureRequestId2', (message: any) => {
      if (message.command === 'requestFileSuggestions') {
        capturedRequestId = message.requestId;
      }
    });
    await webviewPage.evaluate(() => {
      window.addEventListener('vscode-message', (event: any) => {
        (window as any).captureRequestId2(event.detail);
      });
    });

    await webviewPage.keyboard.type('@test.ts');
    await webviewPage.waitForTimeout(500);
    await injector.simulateExtensionMessage('fileSuggestionsResponse', {
      suggestions: [{
        path: '/workspace/test.ts',
        relativePath: 'test.ts',
        name: 'test.ts',
        extension: 'ts',
        icon: 'codicon-file',
        isDirectory: false
      }],
      filterText: 'test.ts',
      requestId: capturedRequestId
    });
    await webviewPage.waitForSelector('.suggestion-item', { state: 'visible' });
    await webviewPage.keyboard.press('Enter');

    // Verify tag exists
    await expect(messageInput.locator('.context-tag')).toHaveCount(1);

    // Press backspace to delete the space after tag, then the tag itself
    await webviewPage.keyboard.press('Backspace'); // Delete space
    await webviewPage.keyboard.press('Backspace'); // Delete tag

    // Verify tag is gone
    await expect(messageInput.locator('.context-tag')).toHaveCount(0);
  });

  test('should toggle selection tag and include it in sendMessage', async ({ webviewPage }) => {
    const injector = new MessageInjector(webviewPage);
    await injector.clearMessageLog();

    // 1. Mock a selection
    const mockSelection = {
      filePath: '/workspace/src/app.ts',
      fileName: 'app.ts',
      startLine: 1,
      endLine: 10,
      selectedText: 'console.log("hello");',
      isEmpty: false
    };

    await injector.simulateExtensionMessage('setInitialState', {
      messages: [],
      selection: mockSelection,
      configurationData: {}
    });

    const selectionTag = webviewPage.locator('.selection-tag');
    await expect(selectionTag).toBeVisible();
    await expect(selectionTag).toHaveClass(/enabled/); // Should be enabled by default when selection exists

    // 2. Toggle it off
    await selectionTag.click();
    await expect(selectionTag).toHaveClass(/disabled/);

    // 3. Type and send
    await webviewPage.getByTestId('message-input').focus();
    await webviewPage.keyboard.type('Hello');

    await webviewPage.evaluate(() => {
      (window as any).sentMessages = [];
      window.addEventListener('vscode-message', (event: any) => {
        if (event.detail.command === 'sendMessage') {
          (window as any).sentMessages.push(event.detail);
        }
      });
    });

    await webviewPage.getByTestId('send-btn').click();

    const sentMessage = await webviewPage.evaluate(() => {
      return (window as any).sentMessages.find((m: any) => m.command === 'sendMessage');
    });

    // Selection should be undefined because it was disabled
    expect(sentMessage.selection).toBeUndefined();

    // 4. Toggle it back on and send again
    await selectionTag.click();
    await expect(selectionTag).toHaveClass(/enabled/);

    await webviewPage.getByTestId('message-input').focus();
    await webviewPage.keyboard.type('Again');
    
    await webviewPage.evaluate(() => { (window as any).sentMessages = []; });
    await webviewPage.getByTestId('send-btn').click();

    const sentMessage2 = await webviewPage.evaluate(() => {
      return (window as any).sentMessages.find((m: any) => m.command === 'sendMessage');
    });

    // Selection should be included
    expect(sentMessage2.selection).toEqual(mockSelection);
  });
});
