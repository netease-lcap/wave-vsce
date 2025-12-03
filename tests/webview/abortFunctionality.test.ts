import { test, expect } from '../utils/webviewTestHarness.js';
import { MessageInjector } from '../utils/messageInjector.js';
import { UIStateVerifier } from '../utils/uiStateVerifier.js';
import { StreamingFixtures } from '../fixtures/streamingFixtures.js';

test.describe('Abort Functionality', () => {
    test('should show abort button during streaming', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);
        const ui = new UIStateVerifier(webviewPage);

        // Initially abort button should be hidden
        await ui.verifyAbortButtonVisible(false);
        await ui.verifySendButtonVisible(true);

        // Start streaming
        await injector.startStreaming();

        // Abort button should now be visible
        await ui.verifyAbortButtonVisible(true);

        // Send button visibility during streaming depends on implementation
        // but abort button should definitely be visible
    });

    test('should hide abort button when not streaming', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);
        const ui = new UIStateVerifier(webviewPage);

        // Start streaming to show abort button
        await injector.startStreaming();
        await ui.verifyAbortButtonVisible(true);

        // Simulate streaming completion by updating with final messages
        await injector.updateMessages([{
            role: "assistant",
            blocks: [{ type: "text", content: "Completed message" }]
        }]);

        // Abort button should be hidden again
        await ui.verifyAbortButtonVisible(false);
        await ui.verifySendButtonVisible(true);
    });

    test('should handle abort button click', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);
        const ui = new UIStateVerifier(webviewPage);

        await injector.clearMessageLog();

        // Start streaming
        await injector.startStreaming();
        await ui.verifyAbortButtonVisible(true);

        // Add some streaming content
        await injector.updateStreaming('This is partial content that will be aborted...');
        await ui.verifyLatestMessageContent('This is partial content');

        // Click abort button
        await ui.clickAbort();

        // Verify abort message was sent to extension
        const sentMessages = await injector.getMessagesSentToExtension();
        const abortMessage = sentMessages.find(msg => msg.command === 'abortMessage');
        expect(abortMessage).toBeDefined();
    });

    test('should preserve partial content when aborted', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);
        const ui = new UIStateVerifier(webviewPage);

        // Start streaming
        await injector.startStreaming();

        // Add some content
        const partialContent = 'This message was interrupted';
        await injector.updateStreaming(partialContent);
        await ui.verifyLatestMessageContent(partialContent);

        // Simulate abort with partial content preservation
        await injector.abortMessage(partialContent);

        // Verify the partial content is still visible and marked as aborted
        await ui.verifyLatestMessageContent(partialContent);
        
        // Check if abort indicator is present (implementation dependent)
        // The message should be preserved but marked as aborted
        await ui.verifyMessageCount(2); // Welcome + aborted message

        // Abort button should be hidden after abort
        await ui.verifyAbortButtonVisible(false);
    });

    test('should allow new messages after abort', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);
        const ui = new UIStateVerifier(webviewPage);

        // Start and abort streaming
        await injector.startStreaming();
        await injector.updateStreaming('Partial content');
        await injector.abortMessage('Partial content');

        // Verify UI is ready for new input
        await ui.verifyInputState(true, false); // Empty but enabled
        await ui.verifyAbortButtonVisible(false);
        await ui.verifySendButtonVisible(true);

        // Send a new message
        await injector.clearMessageLog();
        await ui.sendMessage('New message after abort');

        // Verify message was sent
        const sentMessages = await injector.getMessagesSentToExtension();
        const sendMessage = sentMessages.find(msg => msg.command === 'sendMessage');
        expect(sendMessage?.text).toBe('New message after abort');
    });

    test('should handle abort with streaming scenario', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);
        const ui = new UIStateVerifier(webviewPage);

        // Use the aborted streaming scenario
        const scenario = StreamingFixtures.ABORTED_STREAMING;
        
        // Start streaming
        await injector.startStreaming();
        await ui.verifyAbortButtonVisible(true);

        // Stream up to abort point
        let accumulated = '';
        for (let i = 0; i < (scenario.abortAtChunk || 3); i++) {
            accumulated += scenario.chunks[i];
            await injector.updateStreaming(accumulated);
        }

        // Verify content before abort
        await ui.verifyLatestMessageContent('I\'m going to write a very');

        // Simulate abort
        await injector.abortMessage(scenario.finalContent);

        // Verify abort preserved the expected content
        await ui.verifyLatestMessageContent(scenario.finalContent);
        await ui.verifyAbortButtonVisible(false);
    });
});