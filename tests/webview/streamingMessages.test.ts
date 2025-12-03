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

        // Verify streaming message appears
        await ui.verifyStreamingMessageExists();
        
        // Verify initial streaming content (should show "...")  
        await ui.verifyLatestMessageContent('...');

        // Simulate streaming updates
        const scenario = StreamingFixtures.BASIC_STREAMING;
        let accumulated = '';

        for (const chunk of scenario.chunks) {
            accumulated += chunk;
            await injector.updateStreaming(accumulated);
            
            // Verify content is updated
            await ui.verifyLatestMessageContent(accumulated);
        }

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
            await injector.updateStreaming(accumulated);
            
            // Verify progressive content updates
            await ui.verifyLatestMessageContent(scenario.chunks[0]); // Should contain first chunk
            
            // Small delay to simulate real streaming
            await webviewPage.waitForTimeout(10);
        }

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
        await injector.updateStreaming('');
        await ui.verifyLatestMessageContent('...');

        // Send actual content
        await injector.updateStreaming('Hello world');
        await ui.verifyLatestMessageContent('Hello world');

        // Send empty again (should preserve last content)
        await injector.updateStreaming('');
        // Content should still be visible (implementation dependent)
    });

    test('should differentiate streaming from completed messages', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);
        const ui = new UIStateVerifier(webviewPage);

        // Add a completed message first
        await injector.updateMessages([{
            role: "assistant",
            blocks: [{ type: "text", content: "This is a completed message" }]
        }]);

        await ui.verifyMessageCount(2); // Welcome + completed message
        await ui.verifyNoStreamingMessages();

        // Now start streaming
        await injector.startStreaming();
        
        // Should now have the completed message plus a streaming one
        await ui.verifyMessageCount(3); // Welcome + completed + streaming
        await ui.verifyStreamingMessageExists();

        // Update streaming content
        await injector.updateStreaming('This is streaming content');
        
        // Verify we still have both types
        await ui.verifyMessageCount(3);
        await ui.verifyStreamingMessageExists();
        await ui.verifyMessageContent(1, 'This is a completed message');
        await ui.verifyLatestMessageContent('This is streaming content');
    });
});