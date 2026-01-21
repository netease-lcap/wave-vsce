import { test, expect } from '../utils/webviewTestHarness.js';
import { MessageInjector } from '../utils/messageInjector.js';
import { UIStateVerifier } from '../utils/uiStateVerifier.js';

test.describe('Confirmation Dialog', () => {
    test('should show confirmation dialog for code modification tools', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);
        const ui = new UIStateVerifier(webviewPage);

        // Simulate a confirmation request for Edit tool
        await injector.simulateExtensionMessage('showConfirmation', {
            confirmationId: 'test_confirmation_123',
            toolName: 'Edit',
            confirmationType: '代码修改待确认',
            toolInput: { file_path: 'test.ts', old_string: 'old', new_string: 'new' }
        });

        // Verify confirmation dialog is visible
        const confirmationDialog = webviewPage.locator('.confirmation-dialog');
        await expect(confirmationDialog).toBeVisible();

        // Verify dialog content
        await expect(webviewPage.locator('.confirmation-title')).toHaveText('代码修改待确认');
        await expect(webviewPage.locator('.confirmation-details')).toContainText('工具: Edit');

        // Verify buttons are present
        await expect(webviewPage.locator('.confirmation-btn-apply')).toHaveText('批准并继续');
        await expect(webviewPage.locator('.confirmation-btn-feedback')).toHaveText('提供反馈');
        await expect(webviewPage.locator('.confirmation-btn-reject')).not.toBeVisible();

        // Verify input is hidden when confirmation is showing
        await expect(webviewPage.locator('textarea')).not.toBeVisible();
    });

    test('should show confirmation dialog for command execution tools', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);

        // Simulate a confirmation request for Bash tool
        await injector.simulateExtensionMessage('showConfirmation', {
            confirmationId: 'test_confirmation_456',
            toolName: 'Bash',
            confirmationType: '命令执行待确认',
            toolInput: { command: 'rm -rf temp/' }
        });

        // Verify confirmation dialog content for bash command
        await expect(webviewPage.locator('.confirmation-title')).toHaveText('命令执行待确认');
        await expect(webviewPage.locator('.confirmation-details')).toContainText('工具: Bash');
    });

    test('should send approval response when clicking apply button', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);

        // Clear message log before starting
        await injector.clearMessageLog();

        // Simulate confirmation request
        await injector.simulateExtensionMessage('showConfirmation', {
            confirmationId: 'test_confirmation_789',
            toolName: 'Write',
            confirmationType: '代码修改待确认',
            toolInput: { file_path: 'new_file.ts', content: 'console.log("hello");' }
        });

        // Click apply button
        await webviewPage.locator('.confirmation-btn-apply').click();

        // Verify confirmation dialog is hidden
        await expect(webviewPage.locator('.confirmation-dialog')).not.toBeVisible();

        // Verify input is visible again
        await expect(webviewPage.locator('textarea')).toBeVisible();

        // Verify approval message was sent to extension
        const sentMessages = await injector.getMessagesSentToExtension();
        expect(sentMessages).toHaveLength(1);
        expect(sentMessages[0]).toEqual({
            command: 'confirmationResponse',
            confirmationId: 'test_confirmation_789',
            approved: true,
            decision: {
                behavior: 'allow',
                newPermissionMode: undefined
            }
        });
    });

    test('should send rejection response when clicking close button', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);

        // Clear message log
        await injector.clearMessageLog();

        // Simulate confirmation request
        await injector.simulateExtensionMessage('showConfirmation', {
            confirmationId: 'test_confirmation_reject',
            toolName: 'SomeOtherTool',
            confirmationType: '操作待确认',
            toolInput: {}
        });

        // Click close button
        await webviewPage.locator('.confirmation-close-btn').click();

        // Verify confirmation dialog is hidden
        await expect(webviewPage.locator('.confirmation-dialog')).not.toBeVisible();

        // Verify input is visible again
        await expect(webviewPage.locator('textarea')).toBeVisible();

        // Verify rejection message was sent to extension
        const sentMessages = await injector.getMessagesSentToExtension();
        expect(sentMessages).toHaveLength(1);
        expect(sentMessages[0]).toEqual({
            command: 'confirmationResponse',
            confirmationId: 'test_confirmation_reject',
            approved: false
        });
    });

    test('should handle multiple confirmation requests sequentially', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);

        // Clear message log
        await injector.clearMessageLog();

        // First confirmation request
        await injector.simulateExtensionMessage('showConfirmation', {
            confirmationId: 'confirmation_1',
            toolName: 'Edit',
            confirmationType: '代码修改待确认',
            toolInput: { file_path: 'file1.ts' }
        });

        // Verify first confirmation is visible
        await expect(webviewPage.locator('.confirmation-dialog')).toBeVisible();
        await expect(webviewPage.locator('.confirmation-details')).toContainText('工具: Edit');

        // Approve first confirmation
        await webviewPage.locator('.confirmation-btn-apply').click();

        // Verify dialog is hidden
        await expect(webviewPage.locator('.confirmation-dialog')).not.toBeVisible();

        // Second confirmation request
        await injector.simulateExtensionMessage('showConfirmation', {
            confirmationId: 'confirmation_2',
            toolName: 'SomeOtherTool',
            confirmationType: '操作待确认',
            toolInput: {}
        });

        // Verify second confirmation is visible with correct content
        await expect(webviewPage.locator('.confirmation-dialog')).toBeVisible();
        await expect(webviewPage.locator('.confirmation-details')).toContainText('工具: SomeOtherTool');

        // Reject second confirmation via Esc key
        await webviewPage.keyboard.press('Escape');

        // Verify both responses were sent
        const sentMessages = await injector.getMessagesSentToExtension();
        expect(sentMessages).toHaveLength(2);
        expect(sentMessages[0]).toEqual({
            command: 'confirmationResponse',
            confirmationId: 'confirmation_1',
            approved: true,
            decision: {
                behavior: 'allow',
                newPermissionMode: undefined
            }
        });
        expect(sentMessages[1]).toEqual({
            command: 'confirmationResponse',
            confirmationId: 'confirmation_2',
            approved: false
        });
    });

    test('should handle multiple simultaneous confirmation requests in a queue', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);

        // Clear message log
        await injector.clearMessageLog();

        // Send first confirmation request
        await injector.simulateExtensionMessage('showConfirmation', {
            confirmationId: 'conf_1',
            toolName: 'Edit',
            confirmationType: '代码修改待确认',
            toolInput: { file_path: 'file1.ts' }
        });

        // Verify first confirmation is visible
        await expect(webviewPage.locator('.confirmation-dialog')).toBeVisible();
        await expect(webviewPage.locator('.confirmation-details')).toContainText('工具: Edit');

        // Send second confirmation request while first is still showing
        await injector.simulateExtensionMessage('showConfirmation', {
            confirmationId: 'conf_2',
            toolName: 'Bash',
            confirmationType: '命令执行待确认',
            toolInput: { command: 'ls' }
        });

        // Still should show first confirmation
        await expect(webviewPage.locator('.confirmation-details')).toContainText('工具: Edit');

        // Approve first confirmation
        await webviewPage.locator('.confirmation-btn-apply').click();

        // Verify second confirmation is now visible
        await expect(webviewPage.locator('.confirmation-dialog')).toBeVisible();
        await expect(webviewPage.locator('.confirmation-details')).toContainText('工具: Bash');

        // Approve second confirmation
        await webviewPage.locator('.confirmation-btn-apply').click();

        // Verify dialog is hidden and input is visible
        await expect(webviewPage.locator('.confirmation-dialog')).not.toBeVisible();
        await expect(webviewPage.locator('textarea')).toBeVisible();

        // Verify both responses were sent
        const sentMessages = await injector.getMessagesSentToExtension();
        expect(sentMessages).toHaveLength(2);
        expect(sentMessages[0]).toEqual({
            command: 'confirmationResponse',
            confirmationId: 'conf_1',
            approved: true,
            decision: {
                behavior: 'allow',
                newPermissionMode: undefined
            }
        });
        expect(sentMessages[1]).toEqual({
            command: 'confirmationResponse',
            confirmationId: 'conf_2',
            approved: true,
            decision: {
                behavior: 'allow',
                newPermissionMode: undefined
            }
        });
    });

    test('should position confirmation dialog at bottom and not overlap messages', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);

        // Add some messages first to create content above
        const testMessages = [
            {
                role: 'user' as const,
                blocks: [{ type: 'text', content: 'Test message 1' }]
            },
            {
                role: 'assistant' as const,
                blocks: [{ type: 'text', content: 'Test response 1' }]
            }
        ];

        await injector.updateMessages(testMessages);

        // Simulate confirmation request
        await injector.simulateExtensionMessage('showConfirmation', {
            confirmationId: 'test_position',
            toolName: 'Write',
            confirmationType: '代码修改待确认',
            toolInput: {}
        });

        // Verify dialog is visible
        const dialog = webviewPage.locator('.confirmation-dialog');
        await expect(dialog).toBeVisible();

        // Verify dialog uses normal document flow positioning (not fixed)
        const position = await dialog.evaluate(el => {
            const styles = window.getComputedStyle(el);
            return {
                position: styles.position
            };
        });

        expect(position.position).toBe('static');

        // Verify dialog is at the bottom by checking it appears after messages
        const chatContainer = webviewPage.locator('.chat-container');
        const elementsOrder = await chatContainer.evaluate(container => {
            const elements = Array.from(container.children);
            return elements.map(el => el.className.split(' ')[0]); // Get first class name
        });

        // Confirmation dialog should be the last element in the chat container
        expect(elementsOrder[elementsOrder.length - 1]).toBe('confirmation-dialog');

        // Verify messages are still visible and not overlapped
        await expect(webviewPage.locator('.message').first()).toBeVisible();
    });

    test('should handle confirmation for different tool types correctly', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);

        const toolTests = [
            { toolName: 'Edit', expectedType: '代码修改待确认' },
            { toolName: 'MultiEdit', expectedType: '代码修改待确认' },
            { toolName: 'Write', expectedType: '代码修改待确认' },
            { toolName: 'Delete', expectedType: '代码修改待确认' },
            { toolName: 'Bash', expectedType: '命令执行待确认' },
            { toolName: 'SomeOtherTool', expectedType: '操作待确认' }
        ];

        for (const { toolName, expectedType } of toolTests) {
            // Show confirmation
            await injector.simulateExtensionMessage('showConfirmation', {
                confirmationId: `test_${toolName}`,
                toolName: toolName,
                confirmationType: expectedType,
                toolInput: {}
            });

            // Verify correct confirmation type
            await expect(webviewPage.locator('.confirmation-title')).toHaveText(expectedType);
            await expect(webviewPage.locator('.confirmation-details')).toContainText(`工具: ${toolName}`);

            // Dismiss the dialog
            await webviewPage.locator('.confirmation-btn-apply').click();
            await expect(webviewPage.locator('.confirmation-dialog')).not.toBeVisible();
        }
    });

    test('should occupy bottom space like MessageInput instead of overlaying content', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);

        // Add multiple messages to fill up space
        const manyMessages = Array.from({ length: 5 }, (_, i) => ({
            role: (i % 2 === 0 ? 'user' : 'assistant') as const,
            blocks: [{ type: 'text', content: `Test message ${i + 1} with some longer content to take up space` }]
        }));

        await injector.updateMessages(manyMessages);

        // Get initial message count (includes any default messages)
        const messageCountBefore = await webviewPage.locator('.message').count();
        
        // Verify last message is visible before confirmation
        await expect(webviewPage.locator('.message').last()).toBeVisible();

        // Show confirmation dialog
        await injector.simulateExtensionMessage('showConfirmation', {
            confirmationId: 'test_space_occupation',
            toolName: 'Edit',
            confirmationType: '代码修改待确认',
            toolInput: {}
        });

        // Wait for confirmation to be visible
        await expect(webviewPage.locator('.confirmation-dialog')).toBeVisible();

        // Verify input is hidden (replaced by confirmation)
        await expect(webviewPage.locator('textarea')).not.toBeVisible();

        // All messages should still be accessible and visible (not overlapped)
        const messageCountAfter = await webviewPage.locator('.message').count();
        expect(messageCountAfter).toBe(messageCountBefore); // Same number of messages
        
        // Last message should still be visible and not overlapped by the dialog
        await expect(webviewPage.locator('.message').last()).toBeVisible();

        // Verify confirmation dialog is at the bottom by checking element order
        const chatContainerChildren = await webviewPage.evaluate(() => {
            const chatContainer = document.querySelector('.chat-container');
            return Array.from(chatContainer.children).map(child => child.className);
        });

        // Should have header, messages, and confirmation dialog (no input when confirmation is shown)
        expect(chatContainerChildren).toEqual([
            'chat-header',
            'messages-container',
            'confirmation-dialog'
        ]);

        // Verify confirmation dialog is styled consistently with input area
        const dialogStyles = await webviewPage.locator('.confirmation-dialog').evaluate(el => {
            const styles = window.getComputedStyle(el);
            return {
                borderTop: styles.borderTop,
                position: styles.position
            };
        });

        // Should use static positioning (not fixed/absolute) and have border-top
        expect(dialogStyles.position).toBe('static');
        expect(dialogStyles.borderTop).toContain('1px');
        expect(dialogStyles.borderTop).toContain('solid');
    });

    test('should prevent user interaction with input while confirmation is shown', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);
        const ui = new UIStateVerifier(webviewPage);

        // Verify input is initially visible
        await expect(webviewPage.locator('textarea')).toBeVisible();

        // Show confirmation
        await injector.simulateExtensionMessage('showConfirmation', {
            confirmationId: 'test_input_hidden',
            toolName: 'Edit',
            confirmationType: '代码修改待确认',
            toolInput: {}
        });

        // Verify input is hidden
        await expect(webviewPage.locator('textarea')).not.toBeVisible();

        // Verify confirmation dialog is visible
        await expect(webviewPage.locator('.confirmation-dialog')).toBeVisible();

        // Approve confirmation
        await webviewPage.locator('.confirmation-btn-apply').click();

        // Verify input becomes visible again
        await expect(webviewPage.locator('textarea')).toBeVisible();
        await expect(webviewPage.locator('.confirmation-dialog')).not.toBeVisible();
    });

    test('should support arrow key navigation between buttons', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);

        // Simulate confirmation request for a tool with multiple buttons
        await injector.simulateExtensionMessage('showConfirmation', {
            confirmationId: 'test_arrow_keys',
            toolName: 'SomeOtherTool',
            confirmationType: '操作待确认',
            toolInput: {}
        });

        // Wait for initial focus (Apply button)
        const applyBtn = webviewPage.locator('.confirmation-btn-apply');
        await expect(applyBtn).toBeFocused();

        // Press ArrowRight
        await webviewPage.keyboard.press('ArrowRight');
        const autoBtn = webviewPage.locator('.confirmation-btn-auto');
        await expect(autoBtn).toBeFocused();

        // Press ArrowRight again (should wrap around since reject is gone)
        await webviewPage.keyboard.press('ArrowRight');
        await expect(applyBtn).toBeFocused();

        // Press ArrowLeft (should wrap around to auto)
        await webviewPage.keyboard.press('ArrowLeft');
        await expect(autoBtn).toBeFocused();
    });
});