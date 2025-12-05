import { Page } from '@playwright/test';
import type { Message } from 'wave-agent-sdk';

/**
 * Utilities for injecting messages and simulating extension communication
 */
export class MessageInjector {
    constructor(private page: Page) {}

    /**
     * Simulate receiving messages from the extension
     */
    async simulateExtensionMessage(command: string, data: any = {}) {
        return await this.page.evaluate((args) => {
            const message = { command: args.command, ...args.data };
            window.simulateExtensionMessage(message);
        }, { command, data });
    }

    /**
     * Update the chat with a list of messages
     */
    async updateMessages(messages: Message[]) {
        // Pass Message objects directly to the webview (no conversion needed)
        await this.simulateExtensionMessage('updateMessages', { messages });
    }

    /**
     * Start streaming mode
     */
    async startStreaming() {
        await this.simulateExtensionMessage('startStreaming');
    }

    /**
     * End streaming mode
     */
    async endStreaming() {
        await this.simulateExtensionMessage('endStreaming');
    }

    /**
     * Simulate message abort by sending a message with an error block
     */
    async abortMessage(partialContent: string) {
        // Create a message with an error block to represent aborted content
        const abortedMessage = {
            role: 'assistant' as const,
            blocks: [
                {
                    type: 'error' as const,
                    content: partialContent
                }
            ]
        };
        
        // Send as final message (this replaces any streaming message)
        await this.updateMessages([abortedMessage]);
    }



    /**
     * Clear all messages
     */
    async clearMessages() {
        await this.updateMessages([]);
    }

    /**
     * Simulate tool update
     */
    async updateTool(toolName: string, stage: string, result?: string) {
        const params = {
            name: toolName,
            stage: stage,
            result: result
        };
        await this.simulateExtensionMessage('updateTool', { params });
    }

    /**
     * Get messages that were sent to the extension
     */
    async getMessagesSentToExtension(): Promise<any[]> {
        return await this.page.evaluate(() => {
            return window.getTestMessages();
        });
    }

    /**
     * Clear the message log
     */
    async clearMessageLog() {
        await this.page.evaluate(() => {
            window.clearTestMessages();
        });
    }

    /**
     * Wait for a specific message to be sent to the extension
     */
    async waitForMessage(command: string, timeout = 5000): Promise<any> {
        return await this.page.waitForFunction(
            (expectedCommand) => {
                const messages = window.getTestMessages();
                return messages.find(msg => msg.command === expectedCommand);
            },
            command,
            { timeout }
        );
    }

    /**
     * Update sessions list
     */
    async updateSessions(sessions: any[]) {
        await this.simulateExtensionMessage('updateSessions', { sessions });
    }

    /**
     * Update current session
     */
    async updateCurrentSession(session: any) {
        await this.simulateExtensionMessage('updateCurrentSession', { session });
    }

    /**
     * Simulate sessions loading state
     */
    async setSessionsLoading(loading: boolean) {
        // This would normally be handled internally, but for testing we can simulate the state
        if (loading) {
            await this.simulateExtensionMessage('updateSessions', { sessions: [] });
        }
    }

    /**
     * Simulate sessions error
     */
    async setSessionsError(error: string) {
        await this.simulateExtensionMessage('sessionsError', { error });
    }
}