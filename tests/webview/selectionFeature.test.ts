import { test, expect } from '../utils/webviewTestHarness.js';
import { MessageInjector } from '../utils/messageInjector.js';
import { UIStateVerifier } from '../utils/uiStateVerifier.js';

test.describe('Selection Feature', () => {
    test('should display selection tag and toggle it', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);
        const ui = new UIStateVerifier(webviewPage);

        // 1. Simulate selection update from extension
        const selection = {
            filePath: '/path/to/src/file.ts',
            fileName: 'src/file.ts',
            startLine: 10,
            endLine: 20,
            lineCount: 11,
            selectedText: 'const x = 1;\nconst y = 2;',
            isEmpty: false
        };

        await webviewPage.evaluate((sel) => {
            window.postMessage({
                command: 'updateSelection',
                selection: sel
            }, '*');
        }, selection);

        // Wait for selection tag to appear and verify content
        const selectionTag = webviewPage.locator('.selection-tag');
        await expect(selectionTag).toBeVisible();
        await expect(selectionTag).toContainText('file.ts#10-20');
        
        // Verify it's enabled by default when first received
        await expect(selectionTag).toHaveClass(/enabled/);
        await expect(selectionTag).not.toHaveClass(/disabled/);

        // 2. Toggle selection off
        await selectionTag.click();
        
        // Verify it's disabled
        await expect(selectionTag).toHaveClass(/disabled/);
        await expect(selectionTag).not.toHaveClass(/enabled/);

        // 3. Toggle selection back on
        await selectionTag.click();
        await expect(selectionTag).toHaveClass(/enabled/);

        // 4. Send message and verify selection IS included when enabled
        await injector.clearMessageLog();
        await ui.typeMessage('Hello');
        await ui.clickSend();
        
        let sentMessages = await injector.getMessagesSentToExtension();
        let sendMessage = sentMessages.find(m => m.command === 'sendMessage');
        expect(sendMessage).toBeDefined();
        expect(sendMessage.selection).toEqual(selection);

        // Verify it's automatically disabled after sending
        await expect(selectionTag).toHaveClass(/disabled/);
        await expect(selectionTag).not.toHaveClass(/enabled/);

        // 5. Toggle selection back on and then off manually
        await selectionTag.click();
        await expect(selectionTag).toHaveClass(/enabled/);
        await selectionTag.click();
        await expect(selectionTag).toHaveClass(/disabled/);
        
        // 6. Send message and verify selection is NOT included when disabled
        await injector.clearMessageLog();
        await ui.typeMessage('Hello again');
        await ui.clickSend();
        
        sentMessages = await injector.getMessagesSentToExtension();
        sendMessage = sentMessages.find(m => m.command === 'sendMessage');
        expect(sendMessage).toBeDefined();
        expect(sendMessage.selection).toBeUndefined();

        // 7. Change selection and verify it's automatically enabled
        const newSelection = {
            ...selection,
            startLine: 21,
            endLine: 30,
            selectedText: 'new selection'
        };

        await webviewPage.evaluate((sel) => {
            window.postMessage({
                command: 'updateSelection',
                selection: sel
            }, '*');
        }, newSelection);

        await expect(selectionTag).toHaveClass(/enabled/);
        await expect(selectionTag).toContainText('file.ts#21-30');

        // 8. Simulate message in history with selection
        const messages = [
            {
                role: 'user',
                blocks: [
                    { 
                        type: 'text', 
                        content: 'Hello again\n\n[Selection: file.ts#10-20]' 
                    }
                ]
            }
        ];
        await injector.updateMessages(messages);
        
        // Wait for message to render and verify reference block
        const selectionRef = webviewPage.locator('.selection-reference');
        await expect(selectionRef).toBeVisible();
        await expect(selectionRef.locator('.selection-header')).toContainText('file.ts#10-20');
        
        // Verify no code block is rendered (as per latest requirement)
        const selectionCode = selectionRef.locator('.selection-code');
        await expect(selectionCode).not.toBeVisible();
    });
});
