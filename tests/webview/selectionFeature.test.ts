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

        // Wait for selection tag to appear
        await webviewPage.waitForSelector('.selection-tag');
        
        // Take screenshot of the selection tag (enabled)
        await webviewPage.screenshot({ path: 'selection-tag-enabled.png' });

        // 2. Toggle selection off
        await webviewPage.click('.selection-tag');
        
        // Verify it's disabled (has 'disabled' class)
        const isDisabled = await webviewPage.locator('.selection-tag').evaluate(el => el.classList.contains('disabled'));
        expect(isDisabled).toBe(true);
        
        // Take screenshot of the selection tag (disabled)
        await webviewPage.screenshot({ path: 'selection-tag-disabled.png' });

        // 3. Send message and verify selection is NOT included when disabled
        await injector.clearMessageLog();
        await ui.typeMessage('Hello');
        await ui.clickSend();
        
        let sentMessages = await injector.getMessagesSentToExtension();
        expect(sentMessages[0].selection).toBeUndefined();

        // 4. Toggle selection back on
        await webviewPage.click('.selection-tag');
        
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
                        content: 'Hello again\n\n[Selection: file.ts#10-20]\n```\nconst x = 1;\nconst y = 2;\n```' 
                    }
                ]
            }
        ];
        await injector.updateMessages(messages);
        
        // Wait for message to render
        await webviewPage.waitForSelector('.selection-reference');
        
        // Take screenshot of the message with selection reference
        await webviewPage.screenshot({ path: 'message-with-selection.png' });
    });
});
