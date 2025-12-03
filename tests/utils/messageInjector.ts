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
        // Convert Message objects to display format (matching chatProvider.ts logic)
        const displayMessages = messages.map(msg => {
            const textBlocks = msg.blocks?.filter(block => block.type === 'text') || [];
            const errorBlocks = msg.blocks?.filter(block => block.type === 'error') || [];
            
            // For error messages, use error content; otherwise use text content
            let content = '';
            if (errorBlocks.length > 0) {
                content = errorBlocks.map(block => block.content).join('\n');
            } else {
                content = textBlocks.map(block => block.content).join('\n') || '';
            }
            
            const toolBlocks = msg.blocks?.filter(block => block.type === 'tool') || [];
            const tool_calls = toolBlocks.map(tool => ({
                function: {
                    name: tool.name || 'unknown',
                    arguments: tool.parameters || {}
                }
            }));

            return {
                role: msg.role,
                content: content,
                tool_calls: tool_calls.length > 0 ? tool_calls : undefined,
                // Add a flag to indicate this is an error message
                isError: errorBlocks.length > 0
            };
        });

        await this.simulateExtensionMessage('updateMessages', { messages: displayMessages });
    }

    /**
     * Start streaming mode
     */
    async startStreaming() {
        await this.simulateExtensionMessage('startStreaming');
    }

    /**
     * Update streaming content
     */
    async updateStreaming(accumulated: string) {
        await this.simulateExtensionMessage('updateStreaming', { accumulated });
    }

    /**
     * Simulate message abort
     */
    async abortMessage(partialContent: string) {
        await this.simulateExtensionMessage('messageAborted', { partialContent });
    }

    /**
     * Show error message
     */
    async showError(error: string) {
        await this.simulateExtensionMessage('showError', { error });
    }

    /**
     * Clear all messages
     */
    async clearMessages() {
        await this.simulateExtensionMessage('clearMessages');
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
}