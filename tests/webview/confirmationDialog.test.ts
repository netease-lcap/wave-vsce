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
        await expect(webviewPage.locator('.confirmation-text')).toHaveText('代码修改待确认');
        await expect(webviewPage.locator('.confirmation-details')).toContainText('工具: Edit');

        // Verify buttons are present
        await expect(webviewPage.locator('.confirmation-btn-apply')).toHaveText('应用');
        await expect(webviewPage.locator('.confirmation-btn-reject')).toHaveText('拒绝');

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
        await expect(webviewPage.locator('.confirmation-text')).toHaveText('命令执行待确认');
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
            approved: true
        });
    });

    test('should send rejection response when clicking reject button', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);

        // Clear message log
        await injector.clearMessageLog();

        // Simulate confirmation request
        await injector.simulateExtensionMessage('showConfirmation', {
            confirmationId: 'test_confirmation_reject',
            toolName: 'Delete',
            confirmationType: '代码修改待确认',
            toolInput: { file_path: 'unwanted_file.ts' }
        });

        // Click reject button
        await webviewPage.locator('.confirmation-btn-reject').click();

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
            toolName: 'Bash',
            confirmationType: '命令执行待确认',
            toolInput: { command: 'ls -la' }
        });

        // Verify second confirmation is visible with correct content
        await expect(webviewPage.locator('.confirmation-dialog')).toBeVisible();
        await expect(webviewPage.locator('.confirmation-details')).toContainText('工具: Bash');

        // Reject second confirmation
        await webviewPage.locator('.confirmation-btn-reject').click();

        // Verify both responses were sent
        const sentMessages = await injector.getMessagesSentToExtension();
        expect(sentMessages).toHaveLength(2);
        expect(sentMessages[0]).toEqual({
            command: 'confirmationResponse',
            confirmationId: 'confirmation_1',
            approved: true
        });
        expect(sentMessages[1]).toEqual({
            command: 'confirmationResponse',
            confirmationId: 'confirmation_2',
            approved: false
        });
    });

    test('should position confirmation dialog at bottom of screen', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);

        // Simulate confirmation request
        await injector.simulateExtensionMessage('showConfirmation', {
            confirmationId: 'test_position',
            toolName: 'Write',
            confirmationType: '代码修改待确认',
            toolInput: {}
        });

        // Verify dialog positioning
        const dialog = webviewPage.locator('.confirmation-dialog');
        await expect(dialog).toBeVisible();

        // Check CSS properties for bottom positioning
        const position = await dialog.evaluate(el => {
            const styles = window.getComputedStyle(el);
            return {
                position: styles.position,
                bottom: styles.bottom,
                left: styles.left,
                right: styles.right
            };
        });

        expect(position.position).toBe('fixed');
        expect(position.bottom).toBe('0px');
        expect(position.left).toBe('0px');
        expect(position.right).toBe('0px');
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
            await expect(webviewPage.locator('.confirmation-text')).toHaveText(expectedType);
            await expect(webviewPage.locator('.confirmation-details')).toContainText(`工具: ${toolName}`);

            // Dismiss the dialog
            await webviewPage.locator('.confirmation-btn-apply').click();
            await expect(webviewPage.locator('.confirmation-dialog')).not.toBeVisible();
        }
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
});