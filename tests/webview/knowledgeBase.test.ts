import { test, expect } from '../utils/webviewTestHarness.js';
import { MessageInjector } from '../utils/messageInjector.js';

test.describe('Knowledge Base Integration', () => {
  test('should navigate through knowledge base and select a file', async ({ webviewPage }) => {
    const injector = new MessageInjector(webviewPage);

    // 1. Setup configuration with backendLink
    await injector.simulateExtensionMessage('configurationResponse', {
      configurationData: {
        backendLink: 'http://localhost:3001'
      }
    });

    // 2. Set up listener for getKbItems and respond with mock data
    let capturedDownloadMessage: any = null;
    await webviewPage.exposeFunction('handleExtensionRequests', async (message: any) => {
      if (message.command === 'getKbItems') {
        if (message.level === 'root') {
          await injector.simulateExtensionMessage('kbItemsResponse', {
            level: 'root',
            result: {
              success: true,
              data: {
                data: [{ id: 1, name: '技术文档库' }]
              }
            }
          });
        } else if (message.level === 'kb') {
          await injector.simulateExtensionMessage('kbItemsResponse', {
            level: 'kb',
            kbId: message.kbId,
            result: {
              success: true,
              data: {
                data: [{ id: 10, name: 'API文档' }]
              }
            }
          });
        } else if (message.level === 'folder') {
          await injector.simulateExtensionMessage('kbItemsResponse', {
            level: 'folder',
            kbId: message.kbId,
            folderId: message.folderId,
            result: {
              success: true,
              data: {
                data: [{ id: 2, original_filename: 'api.md' }]
              }
            }
          });
        }
      } else if (message.command === 'downloadKbFile') {
        capturedDownloadMessage = message;
      }
    });

    await webviewPage.evaluate(() => {
      window.addEventListener('vscode-message', (event: any) => {
        (window as any).handleExtensionRequests(event.detail);
      });
    });

    // 3. Type @ to trigger suggestions
    const messageInput = webviewPage.getByTestId('message-input');
    await messageInput.fill('@');
    await messageInput.press('End');

    // Wait for suggestions to render
    await webviewPage.waitForTimeout(500);

    // 3. Verify "知识库" option is visible
    const kbOption = webviewPage.locator('.kb-option');
    await expect(kbOption).toBeVisible();
    await expect(kbOption).toContainText('知识库');

    // 4. Click "知识库"
    await kbOption.click();
    await webviewPage.waitForTimeout(500);

    // 5. Verify Knowledge Base list is shown
    // Based on our curl, we expect "技术文档库"
    const kbItem = webviewPage.locator('.suggestion-item').filter({ hasText: '技术文档库' });
    await expect(kbItem).toBeVisible();

    // 6. Click the Knowledge Base
    await kbItem.click();
    await webviewPage.waitForTimeout(500);

    // 7. Verify Folder list is shown
    // Based on our curl, we expect "API文档"
    const folderItem = webviewPage.locator('.suggestion-item').filter({ hasText: 'API文档' });
    await expect(folderItem).toBeVisible();

    // 8. Click the Folder
    await folderItem.click();
    await webviewPage.waitForTimeout(500);

    // 9. Verify File list is shown
    // Based on our curl, we expect "api.md"
    const fileItem = webviewPage.locator('.suggestion-item').filter({ hasText: 'api.md' });
    await expect(fileItem).toBeVisible();

    // 10. Set up listener for downloadKbFile message
    // Note: listener already added in step 2

    // 11. Click the File
    await fileItem.click();
    await webviewPage.waitForTimeout(200);

    // 12. Verify downloadKbFile message was sent
    expect(capturedDownloadMessage).not.toBeNull();
    expect(capturedDownloadMessage.fileId).toBe(2);
    expect(capturedDownloadMessage.fileName).toBe('api.md');
    expect(capturedDownloadMessage.backendLink).toBe('http://localhost:3001');

    // 13. Simulate file downloaded response
    const tempPath = '/tmp/wave-kb-downloads/api.md';
    await injector.simulateExtensionMessage('kbFileDownloaded', {
      tempPath: tempPath
    });

    // 14. Verify the path is inserted into the input
    const inputValue = await messageInput.inputValue();
    expect(inputValue).toContain(tempPath);
  });

  test('should not show "知识库" option if backendLink is not configured', async ({ webviewPage }) => {
    const injector = new MessageInjector(webviewPage);

    // 1. Setup configuration WITHOUT backendLink
    await injector.simulateExtensionMessage('configurationResponse', {
      configurationData: {
        apiKey: 'test-key'
      }
    });

    // 2. Type @ to trigger suggestions
    const messageInput = webviewPage.getByTestId('message-input');
    await messageInput.fill('@');
    await messageInput.press('End');

    // Wait for suggestions to render
    await webviewPage.waitForTimeout(500);

    // 3. Verify "知识库" option is NOT visible
    const kbOption = webviewPage.locator('.kb-option');
    await expect(kbOption).not.toBeVisible();
  });
});
