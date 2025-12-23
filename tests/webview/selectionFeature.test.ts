import { test, expect } from '../utils/webviewTestHarness.js';
import { MessageInjector } from '../utils/messageInjector.js';
import { UIStateVerifier } from '../utils/uiStateVerifier.js';

test.describe('Selection Feature', () => {
    test('should display selection tag and toggle it', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);
        const ui = new UIStateVerifier(webviewPage);

        // 1. Simulate selection update from extension
        const selection = {
            filePath: '/path/to/file.ts',
            fileName: 'file.ts',
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
        
        // Verify it's enabled by default
        await expect(selectionTag).toHaveClass(/enabled/);
        await expect(selectionTag).not.toHaveClass(/disabled/);

        // 2. Toggle selection off
        await selectionTag.click();
        
        // Verify it's disabled
        await expect(selectionTag).toHaveClass(/disabled/);
        await expect(selectionTag).not.toHaveClass(/enabled/);

        // 3. Send message and verify selection is NOT included when disabled
        await injector.clearMessageLog();
        await ui.typeMessage('Hello');
        await ui.clickSend();
        
        let sentMessages = await injector.getMessagesSentToExtension();
        expect(sentMessages[0].selection).toBeUndefined();

        // 4. Toggle selection back on
        await selectionTag.click();
        await expect(selectionTag).toHaveClass(/enabled/);
        
        // 5. Send message and verify selection IS included when enabled
        await injector.clearMessageLog();
        await ui.typeMessage('Hello again');
        await ui.clickSend();
        
        sentMessages = await injector.getMessagesSentToExtension();
        expect(sentMessages[0].selection).toEqual(selection);

        // 6. Simulate message in history with selection
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
