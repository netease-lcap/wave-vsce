import { test, expect } from '../utils/webviewTestHarness.js';
import { MessageInjector } from '../utils/messageInjector.js';
import { UIStateVerifier } from '../utils/uiStateVerifier.js';

test.describe('Product Spec: History Search', () => {
    test('should capture history search popup screenshot', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);
        const ui = new UIStateVerifier(webviewPage);

        // 1. Focus input
        const messageInput = webviewPage.getByTestId('message-input');
        await messageInput.focus();

        // 2. Press Ctrl+R
        await webviewPage.keyboard.press('Control+r');

        // 3. Simulate history response from extension
        const mockHistory = [
            { prompt: 'I changed my mind, revert it', timestamp: 1774325357000 },
            { prompt: 'I have create a new popo robot named Notification, use this to send message to user', timestamp: 1774325174000 },
            { prompt: '/speckit:constitution all templates must be written in chinese', timestamp: 1774851151833 }
        ];

        await injector.simulateExtensionMessage('historyResponse', {
            history: mockHistory
        });

        // 4. Wait for popup to be visible
        const popup = webviewPage.getByTestId('history-search-popup');
        await expect(popup).toBeVisible();

        // 5. Take screenshot of the whole webview to show the popup in context
        await webviewPage.screenshot({
            path: 'screenshots/spec-history-search.png'
        });

        // 6. Take a full screenshot showing the context
        await webviewPage.screenshot({
            path: 'screenshots/spec-history-search-context.png'
        });
    });
});
