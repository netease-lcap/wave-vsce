import { test, expect } from '../utils/webviewTestHarness.js';
import { MessageInjector } from '../utils/messageInjector.js';
import { UIStateVerifier } from '../utils/uiStateVerifier.js';
import { MockDataGenerator } from '../fixtures/mockData.js';

test.describe('Error Message Display', () => {
    test('should display error messages', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);
        const ui = new UIStateVerifier(webviewPage);

        // Simulate an error
        const errorMessage = 'Connection failed: Unable to reach the server';
        await injector.showError(errorMessage);

        // Verify error is displayed 
        await ui.verifyErrorMessageDisplayed(errorMessage);

        // Verify interface remains functional
        await ui.verifyInputState(true, false); // Empty but enabled
        await ui.verifySendButtonVisible(true);
    });

    test('should handle error messages in conversation context', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);
        const ui = new UIStateVerifier(webviewPage);

        // Have some normal conversation first
        const messages = [
            MockDataGenerator.createUserMessage('Hello'),
            MockDataGenerator.createAssistantMessage('Hi there!')
        ];
        await injector.updateMessages(messages);

        await ui.verifyMessageCount(3); // Welcome + user + assistant

        // Now show an error
        await injector.showError('An error occurred while processing your request');

        // Verify error is displayed and previous messages remain
        await ui.verifyErrorMessageDisplayed('An error occurred');
        await ui.verifyMessageContent(1, 'Hello');
        await ui.verifyMessageContent(2, 'Hi there!');
    });

    test('should display error messages from agent', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);
        const ui = new UIStateVerifier(webviewPage);

        // Create an error message using the agent's error block format
        const errorMessage = MockDataGenerator.createErrorMessage('Failed to read file: Permission denied');
        
        await injector.updateMessages([errorMessage]);

        // Verify error message is displayed
        await ui.verifyMessageCount(2); // Welcome + error
        await ui.verifyLatestMessageContent('Failed to read file: Permission denied');
    });

    test('should handle multiple error types', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);
        const ui = new UIStateVerifier(webviewPage);

        // Test different error scenarios
        const errors = [
            'Network timeout',
            'Invalid API key', 
            'File not found',
            'Permission denied'
        ];

        for (let i = 0; i < errors.length; i++) {
            await injector.showError(errors[i]);
            
            // Verify this specific error appears
            await ui.verifyErrorMessageDisplayed(errors[i]);
            
            // Verify we now have i+1 error messages total
            await ui.verifyErrorMessageCount(i + 1);
            
            // Brief delay between errors
            await webviewPage.waitForTimeout(50);
        }

        // Verify all errors are still present
        await ui.verifyErrorMessageCount(errors.length);
    });

    test('should allow recovery after error', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);
        const ui = new UIStateVerifier(webviewPage);

        // Show error
        await injector.showError('Something went wrong');
        await ui.verifyErrorMessageDisplayed('Something went wrong');

        // Verify user can still send messages
        await injector.clearMessageLog();
        await ui.sendMessage('Can you try again?');

        // Verify message was sent
        const sentMessages = await injector.getMessagesSentToExtension();
        expect(sentMessages).toHaveLength(1);
        expect(sentMessages[0].text).toBe('Can you try again?');

        // Simulate successful response after error
        const messages = [
            MockDataGenerator.createUserMessage('Can you try again?'),
            MockDataGenerator.createAssistantMessage('Sure! Let me try that again.')
        ];
        await injector.updateMessages(messages);

        // Verify normal conversation resumed
        await ui.verifyLatestMessageContent('Sure! Let me try that again.');
    });

    test('should handle errors during streaming', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);
        const ui = new UIStateVerifier(webviewPage);

        // Start streaming
        await injector.startStreaming();
        await ui.verifyStreamingMessageExists();

        // Add some streaming content
        await injector.updateStreaming('I was working on your request when...');

        // Show error during streaming
        await injector.showError('Connection lost during streaming');

        // Verify error is displayed
        await ui.verifyErrorMessageDisplayed('Connection lost during streaming');

        // Verify streaming state is reset
        await ui.verifyAbortButtonVisible(false);

        // Verify interface is functional again
        await ui.verifyInputState(true, false);
        await ui.verifySendButtonVisible(true);
    });
});