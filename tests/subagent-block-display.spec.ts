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
    
    // Initially should show 0 tools
    await expect(subagentDisplay.locator('.tools-count')).toContainText('0 tools');

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
                type: 'tool',
                name: 'Glob',
                stage: 'end',
                parameters: JSON.stringify({ pattern: '**/*.ts' }),
                result: 'Found 15 TypeScript files'
              }
            ]
          },
          {
            role: 'assistant', 
            blocks: [
              {
                type: 'tool',
                name: 'Read',
                stage: 'end', 
                parameters: JSON.stringify({ file_path: '/src/index.ts' }),
                result: 'File content loaded successfully'
              }
            ]
          }
        ]
      }, '*');
    });

    // Wait for the UI to update
    await webviewPage.waitForTimeout(100);

    // Should now show live messages (only tool blocks, content should be hidden)
    const messageWrappers = subagentDisplay.locator('.subagent-message-wrapper');
    await expect(messageWrappers).toHaveCount(2);
    
    // Should show tools count in header
    await expect(subagentDisplay.locator('.tools-count')).toContainText('2 tools');
    
    // Content should be hidden, but messages should still be present
    await expect(messageWrappers.first()).toBeVisible();
    await expect(messageWrappers.last()).toBeVisible();
    
    // Verify that message content is not rendered (hidden)
    await expect(messageWrappers.first().locator('.message-content')).not.toBeVisible();
    await expect(messageWrappers.last().locator('.message-content')).not.toBeVisible();

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
        type: 'tool' as const,
        name: 'Bash',
        stage: 'end' as const,
        parameters: JSON.stringify({ command: `echo "Step ${i + 1}"` }),
        result: `Step ${i + 1}: This is a detailed message about step ${i + 1}`
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

    // Should show tools count in header
    await expect(subagentDisplay.locator('.tools-count')).toContainText('5 tools');

    // Should only render 2 message wrappers (steps 4, 5)
    const messageWrappers = subagentDisplay.locator('.subagent-message-wrapper');
    await expect(messageWrappers).toHaveCount(2);
    
    // Check that it shows the last 2 messages (tool blocks only, content hidden)
    await expect(messageWrappers.first()).toBeVisible();
    await expect(messageWrappers.last()).toBeVisible();
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

    // Check that nested tool blocks are rendered correctly (content should be hidden)
    const messageWrapper = subagentDisplay.locator('.subagent-message-wrapper').first();
    await expect(messageWrapper).toBeVisible();
    
    // Content should be hidden, but the message wrapper should be present
    await expect(messageWrapper.locator('.message-content')).not.toBeVisible();
    
    // Check that the nested tool block is rendered
    const nestedToolBlock = messageWrapper.locator('.tool-block');
    await expect(nestedToolBlock).toBeVisible();
    await expect(nestedToolBlock).toContainText('🛠️ Bash');
  });
});