import { test, expect } from '../utils/webviewTestHarness.js';

/**
 * Test slash commands functionality in the message input
 */

test.describe('Slash Commands', () => {
  test('should insert slash command with a space when selected via Enter', async ({ webviewPage }) => {
    // 1. Focus the input
    const input = webviewPage.getByTestId('message-input');
    await input.focus();

    // 2. Set up listener for slash command request
    const slashCommandPromise = webviewPage.evaluate(() => {
      return new Promise((resolve) => {
        // Check if it's already there
        const messages = (window as any).getTestMessages();
        if (messages.some((m: any) => m.command === 'requestSlashCommands')) {
          resolve(true);
          return;
        }
        
        window.addEventListener('vscode-message', (event: any) => {
          if (event.detail.command === 'requestSlashCommands') {
            resolve(true);
          }
        });
      });
    });

    // 3. Type '/' to trigger slash commands
    await input.press('/');

    // 4. Wait for the request and simulate response from extension
    await slashCommandPromise;
    await webviewPage.evaluate(() => {
      (window as any).simulateExtensionMessage({
        command: 'slashCommandsResponse',
        commands: [
          { id: 'init', name: 'init', description: 'Initialize repository' },
          { id: 'help', name: 'help', description: 'Show help' }
        ]
      });
    });

    // 5. Verify popup is visible
    const popup = webviewPage.getByTestId('slash-commands-popup');
    await expect(popup).toBeVisible();

    // 6. Press Enter to select the first command (init)
    await webviewPage.keyboard.press('Enter');

    // 7. Verify popup is closed
    await expect(popup).not.toBeVisible();

    // 8. Verify input content (should be "/init" + space)
    await expect(async () => {
      const content = await input.innerText();
      expect(content.trim()).toBe('/init');
    }).toPass();
    
    const rawContent = await input.evaluate(el => el.textContent);
    expect(rawContent).toBe('/init ');
  });

  test('should insert slash command correctly after existing text', async ({ webviewPage }) => {
    const input = webviewPage.getByTestId('message-input');
    await input.focus();

    // 1. Type some text and then '/'
    await input.type('hello ');
    // Small delay to ensure DOM is updated
    await webviewPage.waitForTimeout(100);
    await input.press('/');

    // 2. Simulate response
    await webviewPage.evaluate(() => {
      (window as any).simulateExtensionMessage({
        command: 'slashCommandsResponse',
        commands: [
          { id: 'init', name: 'init', description: 'Initialize repository' }
        ]
      });
    });

    // 3. Select command
    await webviewPage.keyboard.press('Enter');

    // 4. Verify content
    await expect(async () => {
      const content = await input.innerText();
      expect(content.trim()).toBe('hello /init');
    }).toPass();
    
    const rawContent = await input.evaluate(el => el.textContent);
    expect(rawContent).toBe('hello /init ');
  });

  test('should insert slash command with Tab key', async ({ webviewPage }) => {
    const input = webviewPage.getByTestId('message-input');
    await input.focus();

    const slashCommandPromise = webviewPage.evaluate(() => {
      return new Promise((resolve) => {
        const messages = (window as any).getTestMessages();
        if (messages.some((m: any) => m.command === 'requestSlashCommands')) {
          resolve(true);
          return;
        }

        window.addEventListener('vscode-message', (event: any) => {
          if (event.detail.command === 'requestSlashCommands') {
            resolve(true);
          }
        });
      });
    });

    await input.press('/');

    await slashCommandPromise;
    await webviewPage.evaluate(() => {
      (window as any).simulateExtensionMessage({
        command: 'slashCommandsResponse',
        commands: [
          { id: 'init', name: 'init', description: 'Initialize repository' },
          { id: 'help', name: 'help', description: 'Show help' }
        ]
      });
    });

    const popup = webviewPage.getByTestId('slash-commands-popup');
    await expect(popup).toBeVisible();

    // Press Tab to select the first command
    await webviewPage.keyboard.press('Tab');

    // Verify popup is closed
    await expect(popup).not.toBeVisible();

    // Verify input content (should be "/init" + space)
    await expect(async () => {
      const content = await input.innerText();
      expect(content.trim()).toBe('/init');
    }).toPass();

    const rawContent = await input.evaluate(el => el.textContent);
    expect(rawContent).toBe('/init ');
  });

  test('should insert slash command when clicked with mouse', async ({ webviewPage }) => {
    const input = webviewPage.getByTestId('message-input');
    await input.focus();

    const slashCommandPromise = webviewPage.evaluate(() => {
      return new Promise((resolve) => {
        const messages = (window as any).getTestMessages();
        if (messages.some((m: any) => m.command === 'requestSlashCommands')) {
          resolve(true);
          return;
        }
        window.addEventListener('vscode-message', (event: any) => {
          if (event.detail.command === 'requestSlashCommands') {
            resolve(true);
          }
        });
      });
    });

    await input.press('/');
    await slashCommandPromise;
    await webviewPage.evaluate(() => {
      (window as any).simulateExtensionMessage({
        command: 'slashCommandsResponse',
        commands: [
          { id: 'init', name: 'init', description: 'Initialize repository' },
          { id: 'help', name: 'help', description: 'Show help' }
        ]
      });
    });

    const popup = webviewPage.getByTestId('slash-commands-popup');
    await expect(popup).toBeVisible();

    // Click the first command item with mouse
    await webviewPage.getByTestId('slash-command-init').click();

    // Verify popup is closed
    await expect(popup).not.toBeVisible();

    // Verify input has the command inserted with trailing space
    await expect(async () => {
      const content = await input.innerText();
      expect(content.trim()).toBe('/init');
    }).toPass();

    const rawContent = await input.evaluate(el => el.textContent);
    expect(rawContent).toBe('/init ');
  });

  test('should filter slash commands as user types', async ({ webviewPage }) => {
    const input = webviewPage.getByTestId('message-input');
    await input.focus();

    // Type '/h'
    await input.type('/h');

    // Simulate response with filtered commands
    await webviewPage.evaluate(() => {
      (window as any).simulateExtensionMessage({
        command: 'slashCommandsResponse',
        commands: [
          { id: 'help', name: 'help', description: 'Show help' }
        ]
      });
    });

    const popup = webviewPage.getByTestId('slash-commands-popup');
    await expect(popup).toBeVisible();
    await expect(popup).toContainText('/help');
    await expect(popup).not.toContainText('/init');
  });
});
