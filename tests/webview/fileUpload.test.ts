import { test, expect } from '../utils/webviewTestHarness.js';
import { MessageInjector } from '../utils/messageInjector.js';

test.describe('File Upload Feature', () => {
  test('should show upload option when typing @ without filter text', async ({ webviewPage }) => {
    const injector = new MessageInjector(webviewPage);

    // Clear any existing messages
    await injector.clearMessageLog();

    // Find the message input textarea
    const messageInput = webviewPage.getByTestId('message-input');
    await expect(messageInput).toBeVisible();

    // Set up listener for vscode messages to capture requestId
    let capturedRequestId = '';
    await webviewPage.exposeFunction('captureMessage', (message: any) => {
      if (message.command === 'requestFileSuggestions') {
        capturedRequestId = message.requestId;
      }
    });

    // Listen for vscode messages
    await webviewPage.evaluate(() => {
      window.addEventListener('vscode-message', (event: any) => {
        (window as any).captureMessage(event.detail);
      });
    });

    // Type @ symbol to trigger file suggestions
    await messageInput.fill('@');
    await messageInput.press('End');

    // Wait for the request to be sent and captured
    await webviewPage.waitForTimeout(400);

    // Simulate response with no filter text
    await injector.simulateExtensionMessage('fileSuggestionsResponse', {
      suggestions: [
        {
          path: '/workspace/src/test.tsx',
          relativePath: 'src/test.tsx',
          name: 'test.tsx',
          extension: 'tsx',
          icon: 'codicon-file',
          isDirectory: false
        }
      ],
      filterText: '', // Empty filter text
      requestId: capturedRequestId || Date.now().toString()
    });

    // Wait for suggestions to render
    await webviewPage.waitForTimeout(500);

    // Check for suggestion items
    const suggestionItems = webviewPage.locator('.suggestion-item');
    const itemCount = await suggestionItems.count();

    // Should have upload option + 1 file = 2 items
    expect(itemCount).toBe(2);

    // Verify the first item is the upload option
    const uploadOption = suggestionItems.first();
    await expect(uploadOption).toContainText('上传本地文件');
    await expect(uploadOption).toHaveClass(/upload-option/);

    // Verify upload option has correct icon
    const uploadIcon = uploadOption.locator('.codicon-cloud-upload');
    await expect(uploadIcon).toBeVisible();
  });

  test('should hide upload option when typing @ with filter text', async ({ webviewPage }) => {
    const injector = new MessageInjector(webviewPage);

    // Clear any existing messages
    await injector.clearMessageLog();

    // Find the message input textarea
    const messageInput = webviewPage.getByTestId('message-input');
    await expect(messageInput).toBeVisible();

    // Set up listener for vscode messages to capture requestId
    let capturedRequestId = '';
    await webviewPage.exposeFunction('captureFilterMessage', (message: any) => {
      if (message.command === 'requestFileSuggestions') {
        capturedRequestId = message.requestId;
      }
    });

    // Listen for vscode messages
    await webviewPage.evaluate(() => {
      window.addEventListener('vscode-message', (event: any) => {
        (window as any).captureFilterMessage(event.detail);
      });
    });

    // Type @test to filter
    await messageInput.fill('@test');
    await messageInput.press('End');

    // Wait for the debounced request
    await webviewPage.waitForTimeout(400);

    // Mock filtered response with filter text
    await injector.simulateExtensionMessage('fileSuggestionsResponse', {
      suggestions: [
        {
          path: '/workspace/src/test.tsx',
          relativePath: 'src/test.tsx',
          name: 'test.tsx',
          extension: 'tsx',
          icon: 'codicon-file',
          isDirectory: false
        }
      ],
      filterText: 'test', // Has filter text
      requestId: capturedRequestId || Date.now().toString()
    });

    await webviewPage.waitForTimeout(500);

    // Should only show filtered results (no upload option when there's filter text)
    const suggestionItems = webviewPage.locator('.suggestion-item');
    const itemCount = await suggestionItems.count();
    expect(itemCount).toBe(1);

    // Verify there's no upload option
    const uploadOption = webviewPage.locator('.suggestion-item.upload-option');
    await expect(uploadOption).not.toBeVisible();

    // Verify the suggestion is the filtered file
    const firstSuggestion = suggestionItems.first();
    await expect(firstSuggestion).toContainText('test.tsx');
  });

  test('should handle upload option selection', async ({ webviewPage }) => {
    const injector = new MessageInjector(webviewPage);

    // Clear any existing messages
    await injector.clearMessageLog();

    // Find the message input textarea
    const messageInput = webviewPage.getByTestId('message-input');
    await expect(messageInput).toBeVisible();

    // Set up listener for vscode messages to capture upload request
    let uploadMessageReceived = false;
    await webviewPage.exposeFunction('captureUploadMessage', (message: any) => {
      if (message.command === 'uploadFilesToArtifacts') {
        uploadMessageReceived = true;
      }
    });

    // Listen for vscode messages
    await webviewPage.evaluate(() => {
      window.addEventListener('vscode-message', (event: any) => {
        (window as any).captureUploadMessage(event.detail);
      });
    });

    // Type @ symbol to trigger file suggestions
    await messageInput.fill('@');
    await messageInput.press('End');

    // Wait for the request
    await webviewPage.waitForTimeout(200);

    // Simulate response with no filter text to show upload option
    await injector.simulateExtensionMessage('fileSuggestionsResponse', {
      suggestions: [],
      filterText: '', // Empty filter text
      requestId: Date.now().toString()
    });

    await webviewPage.waitForTimeout(500);

    // Find and click the upload option
    const uploadOption = webviewPage.locator('.suggestion-item.upload-option');
    await expect(uploadOption).toBeVisible();

    // Note: We can't actually test file selection dialog in headless browser,
    // but we can verify the upload option is clickable and properly structured
    await expect(uploadOption).toContainText('上传本地文件');
    await expect(uploadOption).toContainText('选择本地文件上传到工作区');
  });

  test('should insert file paths into input after successful upload', async ({ webviewPage }) => {
    const injector = new MessageInjector(webviewPage);

    // Clear any existing messages
    await injector.clearMessageLog();

    // Find the message input textarea
    const messageInput = webviewPage.getByTestId('message-input');
    await expect(messageInput).toBeVisible();

    // Type @ symbol to trigger file suggestions (this establishes the @ mention context)
    await messageInput.fill('@');
    await messageInput.press('End');

    await webviewPage.waitForTimeout(200);

    // Simulate successful file upload response
    await injector.simulateExtensionMessage('uploadSuccess', {
      uploadedFiles: [
        '.wave/artifacts/document.pdf',
        '.wave/artifacts/image.png'
      ],
      message: '成功上传 2 个文件到 .wave/artifacts'
    });

    await webviewPage.waitForTimeout(300);

    // Verify that file paths are inserted into the input
    const inputValue = await messageInput.inputValue();
    expect(inputValue).toBe('.wave/artifacts/document.pdf .wave/artifacts/image.png');
  });

  test('should handle single file upload path insertion', async ({ webviewPage }) => {
    const injector = new MessageInjector(webviewPage);

    // Clear any existing messages
    await injector.clearMessageLog();

    // Find the message input textarea
    const messageInput = webviewPage.getByTestId('message-input');
    await expect(messageInput).toBeVisible();

    // Type @ symbol to trigger file suggestions
    await messageInput.fill('@');
    await messageInput.press('End');

    await webviewPage.waitForTimeout(200);

    // Simulate successful single file upload response
    await injector.simulateExtensionMessage('uploadSuccess', {
      uploadedFiles: [
        '.wave/artifacts/single-file.txt'
      ],
      message: '成功上传 1 个文件到 .wave/artifacts'
    });

    await webviewPage.waitForTimeout(300);

    // Verify that single file path is inserted into the input
    const inputValue = await messageInput.inputValue();
    expect(inputValue).toBe('.wave/artifacts/single-file.txt');
  });

  test('should insert file path correctly in basic scenario', async ({ webviewPage }) => {
    const injector = new MessageInjector(webviewPage);

    // Clear any existing messages  
    await injector.clearMessageLog();

    // Find the message input textarea
    const messageInput = webviewPage.getByTestId('message-input');
    await expect(messageInput).toBeVisible();

    // Simple scenario: just type @ and upload
    await messageInput.type('@');

    await webviewPage.waitForTimeout(200);

    // Simulate successful file upload response
    await injector.simulateExtensionMessage('uploadSuccess', {
      uploadedFiles: [
        '.wave/artifacts/test.pdf'
      ],
      message: '成功上传 1 个文件到 .wave/artifacts'
    });

    await webviewPage.waitForTimeout(300);

    // Verify that file path replaces the @ symbol correctly
    const inputValue = await messageInput.inputValue();
    expect(inputValue).toBe('.wave/artifacts/test.pdf');
  });

  test('should not add extra @ symbol when inserting file paths', async ({ webviewPage }) => {
    const injector = new MessageInjector(webviewPage);

    // Clear any existing messages  
    await injector.clearMessageLog();

    // Find the message input textarea
    const messageInput = webviewPage.getByTestId('message-input');
    await expect(messageInput).toBeVisible();

    // Type @ and some filter text
    await messageInput.type('@test');

    await webviewPage.waitForTimeout(200);

    // Simulate successful file upload response
    await injector.simulateExtensionMessage('uploadSuccess', {
      uploadedFiles: [
        '.wave/artifacts/uploaded-file.txt'
      ],
      message: '成功上传 1 个文件到 .wave/artifacts'
    });

    await webviewPage.waitForTimeout(300);

    // Verify that file path replaces filter text correctly and doesn't add extra @
    const inputValue = await messageInput.inputValue();
    expect(inputValue).toBe('.wave/artifacts/uploaded-file.txt');
    expect(inputValue).not.toContain('@'); // Should completely replace @test with file path
  });

});