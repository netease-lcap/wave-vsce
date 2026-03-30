import { test, expect } from '../utils/webviewTestHarness.js';
import { MessageInjector } from '../utils/messageInjector.js';
import { UIStateVerifier } from '../utils/uiStateVerifier.js';
import { MockDataGenerator } from '../fixtures/mockData.js';

test.describe('Rewind Feature', () => {
    test('should send rewindToMessage command when clicking rewind button', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);
        const ui = new UIStateVerifier(webviewPage);

        // Setup a conversation with multiple messages
        const messages = [
            MockDataGenerator.createUserMessage('Message 1', 'msg-1'),
            MockDataGenerator.createAssistantMessage('Response 1', 'msg-2'),
            MockDataGenerator.createUserMessage('Message 2', 'msg-3'),
            MockDataGenerator.createAssistantMessage('Response 2', 'msg-4')
        ];
        await injector.updateMessages(messages);

        // Verify messages are displayed
        await ui.verifyMessageCount(5); // Welcome + 4 messages

        // Clear message log to track new commands
        await injector.clearMessageLog();

        // Click rewind on the first user message (Message 1)
        // Note: userMessages.nth(0) is 'Message 1'
        await ui.clickRewind(0);

        // Verify rewindToMessage command was sent to extension
        const sentMessages = await injector.getMessagesSentToExtension();
        const rewindCommand = sentMessages.find(m => m.command === 'rewindToMessage');
        expect(rewindCommand).toBeDefined();
        expect(rewindCommand).toEqual({
            command: 'rewindToMessage',
            messageId: 'msg-1'
        });
    });

    test('should not show rewind button on assistant messages', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);
        const ui = new UIStateVerifier(webviewPage);

        const messages = [
            MockDataGenerator.createUserMessage('User message'),
            MockDataGenerator.createAssistantMessage('Assistant message')
        ];
        await injector.updateMessages(messages);

        // Hover over assistant message and check for rewind button
        const assistantMessage = ui.assistantMessages.first();
        await assistantMessage.hover();
        const rewindBtn = assistantMessage.locator('.message-action-btn');
        await expect(rewindBtn).toBeHidden();
    });
});
