import { test, expect } from '../utils/webviewTestHarness.js';
import { MessageInjector } from '../utils/messageInjector.js';
import { UIStateVerifier } from '../utils/uiStateVerifier.js';
import { MockDataGenerator } from '../fixtures/mockData.js';

test.describe('Diff Viewer', () => {
  test('should render diff viewer with Monaco editor', async ({ webviewPage }) => {
    const injector = new MessageInjector(webviewPage);
    const ui = new UIStateVerifier(webviewPage);

    // Create a mock diff block message
    const mockDiffMessage = {
      role: 'assistant' as const,
      blocks: [
        {
          type: 'diff',
          path: 'src/example.ts',
          diffResult: [
            { value: 'const hello = "world";\n', removed: true },
            { value: 'const greeting = "hello world";\n', added: true },
            { value: 'console.log(greeting);\n' }
          ]
        }
      ]
    };

    // Update messages to include the diff block
    await injector.updateMessages([mockDiffMessage]);

    // Check that diff viewer container is present
    await expect(webviewPage.locator('.diff-viewer-container')).toBeVisible();

    // Check that diff content is displayed with proper chunks
    await expect(webviewPage.locator('.diff-chunk-removed')).toBeVisible();
    await expect(webviewPage.locator('.diff-chunk-added')).toBeVisible();

    // The diff viewer should render content properly
    await webviewPage.waitForSelector('.diff-viewer-container', { timeout: 5000 });

    // Verify the container structure without header
    await expect(webviewPage.locator('.diff-viewer-container .diff-content')).toBeVisible();
  });

  test('should handle multiple diff blocks in one message', async ({ webviewPage }) => {
    const injector = new MessageInjector(webviewPage);

    const mockMessage = {
      role: 'assistant' as const,
      blocks: [
        {
          type: 'text',
          content: 'Here are the file changes:'
        },
        {
          type: 'diff',
          path: 'src/file1.js',
          diffResult: [
            { value: 'old content\n', removed: true },
            { value: 'new content\n', added: true }
          ]
        },
        {
          type: 'diff',
          path: 'src/file2.ts',
          diffResult: [
            { value: 'function test() {\n' },
            { value: '  return false;\n', removed: true },
            { value: '  return true;\n', added: true },
            { value: '}\n' }
          ]
        }
      ]
    };

    await injector.updateMessages([mockMessage]);

    // Check that both diff viewers are rendered
    const diffViewers = webviewPage.locator('.diff-viewer-container');
    await expect(diffViewers).toHaveCount(2);

    // Check for diff chunks instead of file paths
    await expect(webviewPage.locator('.diff-chunk-removed')).toHaveCount(2);
    await expect(webviewPage.locator('.diff-chunk-added')).toHaveCount(2);

    // Check that text content is also displayed (use more specific selector)
    const assistantMessage = webviewPage.locator('.message.assistant').last();
    await expect(assistantMessage.locator('.message-content')).toContainText('Here are the file changes:');
  });

  test('should handle empty diff result gracefully', async ({ webviewPage }) => {
    const injector = new MessageInjector(webviewPage);

    const mockMessage = {
      role: 'assistant' as const,
      blocks: [
        {
          type: 'diff',
          path: 'empty.txt',
          diffResult: []
        }
      ]
    };

    await injector.updateMessages([mockMessage]);

    // Diff viewer should still render even with empty diff
    await expect(webviewPage.locator('.diff-viewer-container')).toBeVisible();
    await expect(webviewPage.locator('.diff-content')).toBeVisible();
    await expect(webviewPage.locator('.diff-empty')).toHaveText('No changes');
  });

  test('should display diff blocks alongside other block types', async ({ webviewPage }) => {
    const injector = new MessageInjector(webviewPage);

    const mockMessage = {
      role: 'assistant' as const,
      blocks: [
        {
          type: 'text',
          content: 'I will make these changes:'
        },
        {
          type: 'tool',
          name: 'Edit',
          compactParams: 'src/example.ts',
          stage: 'end' as const,
          success: true
        },
        {
          type: 'diff',
          path: 'src/example.ts',
          diffResult: [
            { value: 'const old = "value";\n', removed: true },
            { value: 'const updated = "value";\n', added: true }
          ]
        }
      ]
    };

    await injector.updateMessages([mockMessage]);

    // Check that all block types are rendered (use specific selectors)
    const assistantMessage = webviewPage.locator('.message.assistant').last();
    await expect(assistantMessage.locator('.message-content')).toContainText('I will make these changes:');
    await expect(assistantMessage.locator('.tool-block')).toBeVisible();
    await expect(assistantMessage.locator('.diff-viewer-container')).toBeVisible();

    // Verify order: text content, then tool block, then diff block
    await expect(assistantMessage.locator('.message-content')).toBeVisible();
    await expect(assistantMessage.locator('.tool-block')).toBeVisible();
    await expect(assistantMessage.locator('.diff-viewer-container')).toBeVisible();
  });
});