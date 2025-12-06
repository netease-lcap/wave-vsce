import { test, expect } from '../utils/webviewTestHarness.js';
import { MessageInjector } from '../utils/messageInjector.js';

test.describe('File Mention Feature (@)', () => {
  test('should show file suggestion dropdown when typing @', async ({ webviewPage }) => {
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

    // Take initial screenshot
    await webviewPage.screenshot({
      path: 'test-results/file-mention-initial.png',
      fullPage: true
    });

    // Type @ symbol to trigger file suggestions
    await messageInput.fill('@');
    await messageInput.press('End');

    // Wait for the request to be sent and captured
    await webviewPage.waitForTimeout(200);

    // Take screenshot after typing @
    await webviewPage.screenshot({
      path: 'test-results/file-mention-at-symbol.png',
      fullPage: true
    });

    // Wait a bit more to ensure the debounced request is sent
    await webviewPage.waitForTimeout(200);

    // Use the captured requestId in our response
    await injector.simulateExtensionMessage('fileSuggestionsResponse', {
      suggestions: [
        {
          path: '/workspace/src',
          relativePath: 'src',
          name: 'src',
          extension: '',
          icon: 'codicon-folder',
          isDirectory: true
        },
        {
          path: '/workspace/src/components/MessageInput.tsx',
          relativePath: 'src/components/MessageInput.tsx',
          name: 'MessageInput.tsx',
          extension: 'tsx',
          icon: 'codicon-file',
          isDirectory: false
        },
        {
          path: '/workspace/src/components/ChatApp.tsx',
          relativePath: 'src/components/ChatApp.tsx',
          name: 'ChatApp.tsx',
          extension: 'tsx',
          icon: 'codicon-file',
          isDirectory: false
        }
      ],
      filterText: '',
      requestId: capturedRequestId || Date.now().toString() // Fallback if capture failed
    });

    // Wait for suggestions to render
    await webviewPage.waitForTimeout(500);

    // Take screenshot with mock suggestions
    await webviewPage.screenshot({
      path: 'test-results/file-mention-with-suggestions.png',
      fullPage: true
    });

    // Check if file suggestion dropdown is present
    const dropdown = webviewPage.locator('.file-suggestion-dropdown');
    const isDropdownVisible = await dropdown.isVisible();
    console.log('File suggestion dropdown visible:', isDropdownVisible);
    console.log('Captured requestId:', capturedRequestId);

    // Check dropdown positioning
    if (isDropdownVisible) {
      const dropdownBox = await dropdown.boundingBox();
      const inputBox = await messageInput.boundingBox();

      console.log('Dropdown position:', dropdownBox);
      console.log('Input position:', inputBox);

      // Take focused screenshot of the dropdown area
      await dropdown.screenshot({
        path: 'test-results/dropdown-focused.png'
      });

      // Verify dropdown is positioned correctly relative to input
      if (dropdownBox && inputBox) {
        // Simple check: dropdown should be above input (visual y position less than input y)
        expect(dropdownBox.y).toBeLessThan(inputBox.y);

        // Check horizontal alignment
        expect(Math.abs(dropdownBox.x - inputBox.x)).toBeLessThan(5);
      }
    }

    // Check for suggestion items
    const suggestionItems = webviewPage.locator('.suggestion-item');
    const itemCount = await suggestionItems.count();
    console.log('Number of suggestion items:', itemCount);

    // Expect to see the suggestions we injected (1 folder + 2 files)
    expect(itemCount).toBe(3);
  });

  test('should filter files as user types after @', async ({ webviewPage }) => {
    const injector = new MessageInjector(webviewPage);

    await injector.clearMessageLog();

    const messageInput = webviewPage.getByTestId('message-input');

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

    // Type @src to filter
    await messageInput.fill('@src');
    await messageInput.press('End');

    // Wait for the debounced request
    await webviewPage.waitForTimeout(200);

    console.log('Captured filter requestId:', capturedRequestId);

    // Mock filtered response with captured requestId
    await injector.simulateExtensionMessage('fileSuggestionsResponse', {
      suggestions: [
        {
          path: '/workspace/src/components/MessageInput.tsx',
          relativePath: 'src/components/MessageInput.tsx',
          name: 'MessageInput.tsx',
          extension: 'tsx',
          icon: 'codicon-react'
        }
      ],
      filterText: 'src',
      requestId: capturedRequestId || Date.now().toString()
    });

    await webviewPage.waitForTimeout(500);

    await webviewPage.screenshot({
      path: 'test-results/file-mention-filtered.png',
      fullPage: true
    });

    // Should only show filtered results
    const suggestionItems = webviewPage.locator('.suggestion-item');
    const itemCount = await suggestionItems.count();
    expect(itemCount).toBe(1);

    // Verify the suggestion text contains the filter
    const firstSuggestion = suggestionItems.first();
    await expect(firstSuggestion).toContainText('src');
  });
});