import { test, expect } from '../utils/webviewTestHarness.js';
import { MessageInjector } from '../utils/messageInjector.js';
import { UIStateVerifier } from '../utils/uiStateVerifier.js';
import { MockDataGenerator } from '../fixtures/mockData.js';

test.describe('Product Specification Screenshots - Message Queuing', () => {
    test('capture message queuing features', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);
        const ui = new UIStateVerifier(webviewPage);

        // Set viewport size for better screenshots (simulating VS Code sidebar)
        await webviewPage.setViewportSize({ width: 400, height: 800 });

        // Provide initial state
        await injector.simulateExtensionMessage('setInitialState', {
            messages: [
                MockDataGenerator.createUserMessage('请帮我重构这个函数'),
                MockDataGenerator.createAssistantMessage('好的，我正在分析代码并准备重构建议...')
            ],
            isStreaming: true,
            sessions: [],
            configurationData: {
                authMethod: 'apiKey',
                apiKey: 'sk-xxxxxxxxxxxxxxxx',
                baseURL: 'https://api.openai.com/v1',
                model: 'gpt-4',
                fastModel: 'gpt-3.5-turbo'
            },
            permissionMode: 'default'
        });

        // 1. Show "Add to Queue" button in input
        await webviewPage.focus('[data-testid="message-input"]');
        await webviewPage.keyboard.type('顺便帮我写个测试用例');
        
        // Wait for the button to update
        const sendBtn = webviewPage.getByTestId('send-btn');
        await expect(sendBtn).toHaveAttribute('title', '加入队列');
        
        // Take screenshot of the input area with "Add to Queue" button
        await webviewPage.locator('.input-container').screenshot({ path: 'screenshots/spec-queue-button.png' });

        // 2. Show queued message in the list
        await injector.simulateExtensionMessage('updateQueue', {
            queue: [
                { text: '顺便帮我写个测试用例' }
            ]
        });

        // Wait for the queued message to appear
        await webviewPage.waitForSelector('.message.user.queued');
        
        // Take screenshot of the message list showing the queued message
        await webviewPage.screenshot({ path: 'screenshots/spec-queued-message.png' });
    });
});
