import { test, expect } from '../utils/webviewTestHarness.js';
import { MessageInjector } from '../utils/messageInjector.js';

test.describe('Permission Mode Dropdown', () => {
  test('should open dropdown and select a different mode', async ({ webviewPage }) => {
    const injector = new MessageInjector(webviewPage);
    await injector.clearMessageLog();

    // 1. Initial state: Default mode
    await injector.simulateExtensionMessage('setInitialState', {
      messages: [],
      permissionMode: 'default',
      configurationData: {}
    });

    const toggle = webviewPage.locator('.permission-mode-toggle');
    await expect(toggle).toBeVisible();
    await expect(toggle).toContainText('修改前询问');

    // 2. Click to open dropdown
    await toggle.click();
    const dropdown = webviewPage.locator('.permission-mode-dropdown');
    await expect(dropdown).toBeVisible();

    // 3. Verify options
    const options = dropdown.locator('.permission-mode-item');
    await expect(options).toHaveCount(3);
    await expect(options.nth(0)).toContainText('修改前询问');
    await expect(options.nth(1)).toContainText('自动接受修改');
    await expect(options.nth(2)).toContainText('计划模式');

    // 4. Set up listener for vscode message
    let sentMessage: any = null;
    await webviewPage.exposeFunction('capturePermissionMessage', (message: any) => {
      if (message.command === 'setPermissionMode') {
        sentMessage = message;
      }
    });
    await webviewPage.evaluate(() => {
      window.addEventListener('vscode-message', (event: any) => {
        (window as any).capturePermissionMessage(event.detail);
      });
    });

    // 5. Select "自动接受修改"
    await options.nth(1).click();

    // 6. Verify dropdown is closed
    await expect(dropdown).not.toBeVisible();

    // 7. Verify message sent to extension
    await expect(async () => {
      expect(sentMessage).toEqual({
        command: 'setPermissionMode',
        mode: 'acceptEdits'
      });
    }).toPass();

    // 8. Verify UI update (simulating extension response)
    await injector.simulateExtensionMessage('setInitialState', {
      messages: [],
      permissionMode: 'acceptEdits',
      configurationData: {}
    });
    await expect(toggle).toContainText('自动接受修改');
    await expect(toggle).toHaveClass(/mode-acceptEdits/);
  });

  test('should close dropdown when clicking outside', async ({ webviewPage }) => {
    const injector = new MessageInjector(webviewPage);
    await injector.clearMessageLog();

    await toggleDropdown(webviewPage);
    const dropdown = webviewPage.locator('.permission-mode-dropdown');
    await expect(dropdown).toBeVisible();

    // Click somewhere else (e.g., the message input)
    await webviewPage.getByTestId('message-input').click();

    // Verify dropdown is closed
    await expect(dropdown).not.toBeVisible();
  });
});

async function toggleDropdown(page: any) {
  const toggle = page.locator('.permission-mode-toggle');
  await toggle.click();
}
