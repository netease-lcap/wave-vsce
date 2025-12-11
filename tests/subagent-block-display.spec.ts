import { test, expect } from './utils/webviewTestHarness.js';
import { MessageInjector } from './utils/messageInjector.js';

test.describe('SubagentBlock Display in Messages', () => {
  test('should display subagent block with live messages', async ({ webviewPage }) => {
    const injector = new MessageInjector(webviewPage);

    // First inject a message with a SubagentBlock
    await injector.updateMessages([
      {
        role: 'assistant',
        blocks: [
          {
            type: 'text',
            content: 'I\'ll delegate this task to a specialized subagent.'
          },
          {
            type: 'subagent',
            subagentId: 'subagent-123',
            subagentName: 'Explore',
            status: 'active',
            sessionId: 'session-456', 
            configuration: {
              name: 'Explore',
              description: 'Fast agent specialized for exploring codebases',
              systemPrompt: 'You are a code exploration specialist.'
            }
          }
        ]
      }
    ]);

    // Check that subagent block is rendered
    const subagentDisplay = webviewPage.locator('.subagent-display').first();
    await expect(subagentDisplay).toBeVisible();

    // Check subagent name and status
    await expect(subagentDisplay.locator('.subagent-type')).toContainText('🤖 Explore');
    await expect(subagentDisplay.locator('.subagent-header .subagent-status')).toContainText('⚡ 运行中');

    // Initially should have no messages displayed
    await expect(subagentDisplay.locator('.status-indicator')).toContainText('⏳ 处理中...');

    // Now simulate live subagent messages coming in
    await webviewPage.evaluate(() => {
      window.postMessage({
        command: 'updateSubagentMessages',
        subagentId: 'subagent-123',
        messages: [
          {
            role: 'assistant',
            blocks: [
              {
                type: 'text',
                content: 'Starting codebase exploration...'
              }
            ]
          },
          {
            role: 'assistant', 
            blocks: [
              {
                type: 'text',
                content: 'Found 15 TypeScript files in the project structure.'
              }
            ]
          }
        ]
      }, '*');
    });

    // Wait for the UI to update
    await webviewPage.waitForTimeout(100);

    // Should now show live messages
    const messageWrappers = subagentDisplay.locator('.subagent-message-wrapper');
    await expect(messageWrappers).toHaveCount(2);
    await expect(messageWrappers.first().locator('.message-content')).toContainText('Starting codebase exploration');
    await expect(messageWrappers.last().locator('.message-content')).toContainText('Found 15 TypeScript files');

    // The status indicator should be gone since we have messages
    await expect(subagentDisplay.locator('.status-indicator')).not.toBeVisible();
  });

  test('should display completed subagent status correctly', async ({ webviewPage }) => {
    const injector = new MessageInjector(webviewPage);

    await injector.updateMessages([
      {
        role: 'assistant',
        blocks: [
          {
            type: 'subagent',
            subagentId: 'subagent-completed',
            subagentName: 'CodeAnalyzer', 
            status: 'completed',
            sessionId: 'session-789',
            configuration: {
              name: 'CodeAnalyzer',
              description: 'Deep code analysis specialist',
              systemPrompt: 'You analyze code patterns and architecture.'
            }
          }
        ]
      }
    ]);

    const subagentDisplay = webviewPage.locator('.subagent-display').first();
    await expect(subagentDisplay).toBeVisible();

    // Check completed status
    await expect(subagentDisplay.locator('.subagent-header .subagent-status')).toContainText('✅ 已完成');
    await expect(subagentDisplay.locator('.status-indicator')).toContainText('⏳ 等待消息...');
  });

  test('should display error status correctly', async ({ webviewPage }) => {
    const injector = new MessageInjector(webviewPage);

    await injector.updateMessages([
      {
        role: 'assistant',
        blocks: [
          {
            type: 'subagent',
            subagentId: 'subagent-error',
            subagentName: 'TaskRunner',
            status: 'error',
            sessionId: 'session-error',
            configuration: {
              name: 'TaskRunner',
              description: 'Automated task execution',
              systemPrompt: 'You execute various automated tasks.'
            }
          }
        ]
      }
    ]);

    const subagentDisplay = webviewPage.locator('.subagent-display').first();
    await expect(subagentDisplay).toBeVisible();

    // Check error status
    await expect(subagentDisplay.locator('.subagent-header .subagent-status')).toContainText('❌ 错误');
    await expect(subagentDisplay.locator('.status-indicator')).toContainText('⏳ 等待消息...');
  });

  test('should limit display to last 2 messages for subagent blocks', async ({ webviewPage }) => {
    const injector = new MessageInjector(webviewPage);

    // Create a subagent block
    await injector.updateMessages([
      {
        role: 'assistant',
        blocks: [
          {
            type: 'subagent',
            subagentId: 'subagent-many-msgs',
            subagentName: 'VerboseAgent',
            status: 'active',
            sessionId: 'session-verbose',
            configuration: {
              name: 'VerboseAgent',
              description: 'Agent that generates many messages',
              systemPrompt: 'You provide detailed step-by-step output.'
            }
          }
        ]
      }
    ]);

    // Send many messages for this subagent
    const manyMessages = Array.from({ length: 5 }, (_, i) => ({
      role: 'assistant' as const,
      blocks: [{ 
        type: 'text' as const, 
        content: `Step ${i + 1}: This is a detailed message about step ${i + 1}` 
      }]
    }));

    await webviewPage.evaluate((messages) => {
      window.postMessage({
        command: 'updateSubagentMessages',
        subagentId: 'subagent-many-msgs',
        messages: messages
      }, '*');
    }, manyMessages);

    await webviewPage.waitForTimeout(100);

    const subagentDisplay = webviewPage.locator('.subagent-display').first();
    await expect(subagentDisplay).toBeVisible();

    // Should show total count in the messages header
    await expect(subagentDisplay.locator('.messages-label')).toContainText('最新 2 条，共 5 条消息:');

    // Should only render 2 message wrappers (steps 4, 5)
    const messageWrappers = subagentDisplay.locator('.subagent-message-wrapper');
    await expect(messageWrappers).toHaveCount(2);
    
    // Check that it shows the last 2 messages
    await expect(messageWrappers.first().locator('.message-content')).toContainText('Step 4:');
    await expect(messageWrappers.last().locator('.message-content')).toContainText('Step 5:');
  });

  test('should handle subagent messages with complex content', async ({ webviewPage }) => {
    const injector = new MessageInjector(webviewPage);

    await injector.updateMessages([
      {
        role: 'assistant',
        blocks: [
          {
            type: 'subagent',
            subagentId: 'subagent-complex',
            subagentName: 'ComplexAgent',
            status: 'active',
            sessionId: 'session-complex',
            configuration: {
              name: 'ComplexAgent',
              description: 'Agent with complex output capabilities',
              systemPrompt: 'You provide rich, structured output.'
            }
          }
        ]
      }
    ]);

    // Send a message with nested tool blocks
    await webviewPage.evaluate(() => {
      window.postMessage({
        command: 'updateSubagentMessages',
        subagentId: 'subagent-complex',
        messages: [
          {
            role: 'assistant',
            blocks: [
              {
                type: 'text',
                content: 'Let me analyze the file structure:'
              },
              {
                type: 'tool',
                name: 'Bash',
                stage: 'end',
                parameters: JSON.stringify({ command: 'find src -name "*.ts" | head -5' }),
                result: 'src/index.ts\nsrc/components/App.ts\nsrc/utils/helper.ts\nsrc/types/index.ts\nsrc/services/api.ts'
              }
            ]
          }
        ]
      }, '*');
    });

    await webviewPage.waitForTimeout(100);

    const subagentDisplay = webviewPage.locator('.subagent-display').first();
    await expect(subagentDisplay).toBeVisible();

    // Check that nested tool blocks are rendered correctly
    const messageWrapper = subagentDisplay.locator('.subagent-message-wrapper').first();
    await expect(messageWrapper.locator('.message-content')).toContainText('Let me analyze the file structure');
    
    // Check that the nested tool block is rendered
    const nestedToolBlock = messageWrapper.locator('.tool-block');
    await expect(nestedToolBlock).toBeVisible();
    await expect(nestedToolBlock).toContainText('🛠️ Bash');
  });
});