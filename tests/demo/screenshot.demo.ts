import { test, expect } from '../utils/webviewTestHarness.js';
import { MessageInjector } from '../utils/messageInjector.js';
import { UIStateVerifier } from '../utils/uiStateVerifier.js';
import { MockDataGenerator } from '../fixtures/mockData.js';

test.describe('Screenshot Demo', () => {
    test('capture chat interface', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);
        const ui = new UIStateVerifier(webviewPage);

        // 1. Initial State (Welcome Message)
        await ui.verifyMessageCount(1);
        await webviewPage.screenshot({ path: 'test-results/demo-initial.png' });

        // 2. Populated Conversation
        const conversation = [
            MockDataGenerator.createUserMessage('如何使用 Playwright 进行截图？'),
            MockDataGenerator.createAssistantMessage('使用 Playwright 进行截图非常简单。你可以使用 `page.screenshot()` 方法。例如：\n\n```typescript\nawait page.screenshot({ path: "screenshot.png" });\n```\n\n你还可以截取特定元素的截图：\n\n```typescript\nawait elementHandle.screenshot({ path: "element.png" });\n```')
        ];
        await injector.updateMessages(conversation);
        await injector.endStreaming();
        
        await ui.verifyMessageCount(3); // Welcome + 2 messages
        await webviewPage.screenshot({ path: 'test-results/demo-conversation.png' });

        // 3. Input with text
        await ui.typeMessage('谢谢，这很有帮助！');
        await webviewPage.screenshot({ path: 'test-results/demo-input.png' });
    });
});
