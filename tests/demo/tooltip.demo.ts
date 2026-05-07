import { test, expect } from '../utils/webviewTestHarness.js';
import { MessageInjector } from '../utils/messageInjector.js';
import { UIStateVerifier } from '../utils/uiStateVerifier.js';

test.describe('Tooltip Demo', () => {
    test('capture tooltips', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);
        const ui = new UIStateVerifier(webviewPage);
        
        // 1. Send button tooltip
        await ui.sendButton.hover();
        await webviewPage.screenshot({ path: 'docs/public/screenshots/tooltip-send.png' });
        
        // 2. Streaming tooltips
        await injector.startStreaming();
        await ui.abortButton.hover();
        await webviewPage.screenshot({ path: 'docs/public/screenshots/tooltip-stop.png' });
        
        await ui.sendButton.hover();
        await webviewPage.screenshot({ path: 'docs/public/screenshots/tooltip-join-queue.png' });
        await injector.endStreaming();
        
        // 3. Clear chat tooltip
        await ui.clearChatButton.hover();
        await webviewPage.screenshot({ path: 'docs/public/screenshots/tooltip-clear-chat.png' });
        
        // 4. Permission mode tooltip
        const permissionSelect = webviewPage.locator('.permission-mode-select');
        await permissionSelect.hover();
        await webviewPage.screenshot({ path: 'docs/public/screenshots/tooltip-permission-mode.png' });
    });
});
