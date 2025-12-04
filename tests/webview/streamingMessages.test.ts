import { test, expect } from '../utils/webviewTestHarness.js';
import { MessageInjector } from '../utils/messageInjector.js';
import { UIStateVerifier } from '../utils/uiStateVerifier.js';
import { StreamingFixtures } from '../fixtures/streamingFixtures.js';

test.describe('Streaming Messages', () => {
    test('should display streaming message and updates', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);
        const ui = new UIStateVerifier(webviewPage);

        // Start streaming
        await injector.startStreaming();

        // Verify streaming message appears (abort button visible)
        await ui.verifyStreamingMessageExists();
        
        // Simulate streaming updates using updateMessages
        const scenario = StreamingFixtures.BASIC_STREAMING;
        let accumulated = '';

        for (const chunk of scenario.chunks) {
            accumulated += chunk;
            // Send progressive updates via updateMessages (simulating real agent-sdk behavior)
            await injector.updateMessages([{
                role: "assistant",
                blocks: [{ type: "text", content: accumulated }]
            }]);
            
            // Verify content is updated
            await ui.verifyLatestMessageContent(accumulated);
        }

        // End streaming
        await injector.endStreaming();

        // Verify final accumulated content
        await ui.verifyLatestMessageContent(scenario.finalContent);
    });

    test('should handle longer streaming content', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);
        const ui = new UIStateVerifier(webviewPage);

        // Start streaming
        await injector.startStreaming();
        await ui.verifyStreamingMessageExists();

        // Use code explanation scenario
        const scenario = StreamingFixtures.CODE_EXPLANATION;
        let accumulated = '';

        // Stream content with delays
        for (let i = 0; i < scenario.chunks.length; i++) {
            accumulated += scenario.chunks[i];
            await injector.updateMessages([{
                role: "assistant",
                blocks: [{ type: "text", content: accumulated }]
            }]);
            
            // Verify progressive content updates
            await ui.verifyLatestMessageContent(scenario.chunks[0]); // Should contain first chunk
            
            // Small delay to simulate real streaming
            await webviewPage.waitForTimeout(10);
        }

        // End streaming
        await injector.endStreaming();

        // Verify final content includes all parts
        await ui.verifyLatestMessageContent('Looking at your code');
        await ui.verifyLatestMessageContent('1. Add error handling');
        await ui.verifyLatestMessageContent('3. Return meaningful errors');
    });

    test('should handle empty streaming updates gracefully', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);
        const ui = new UIStateVerifier(webviewPage);

        // Start streaming
        await injector.startStreaming();
        await ui.verifyStreamingMessageExists();

        // Send empty update
        await injector.updateMessages([{
            role: "assistant",
            blocks: [{ type: "text", content: '' }]
        }]);
        // Empty content should show empty message
        await ui.verifyLatestMessageContent('');

        // Send actual content
        await injector.updateMessages([{
            role: "assistant",
            blocks: [{ type: "text", content: 'Hello world' }]
        }]);
        await ui.verifyLatestMessageContent('Hello world');

        // Send empty again
        await injector.updateMessages([{
            role: "assistant",
            blocks: [{ type: "text", content: '' }]
        }]);
        
        // End streaming
        await injector.endStreaming();
    });

    test('should differentiate streaming from completed messages', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);
        const ui = new UIStateVerifier(webviewPage);

        // Add a completed message first
        await injector.updateMessages([{
            role: "assistant",
            blocks: [{ type: "text", content: "This is a completed message" }]
        }]);

        await ui.verifyMessageCount(2); // Welcome (hardcoded) + completed message
        await ui.verifyNoStreamingMessages();

        // Now start streaming
        await injector.startStreaming();
        
        // Should still have 2 messages (streaming doesn't add a message until content arrives)
        await ui.verifyMessageCount(2); // Welcome + completed (no streaming message yet)
        await ui.verifyStreamingMessageExists();

        // Update streaming content by sending new message set
        await injector.updateMessages([{
            role: "assistant",
            blocks: [{ type: "text", content: "This is a completed message" }]
        }, {
            role: "assistant",
            blocks: [{ type: "text", content: "This is streaming content" }]
        }]);
        
        // Verify we now have all three types
        await ui.verifyMessageCount(3); // welcome + completed + streaming
        await ui.verifyStreamingMessageExists();
        await ui.verifyMessageContent(1, 'This is a completed message'); // Completed message (index 1, after welcome)
        await ui.verifyLatestMessageContent('This is streaming content'); // Streaming message
        
        // End streaming
        await injector.endStreaming();
    });
});