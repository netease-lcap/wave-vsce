import { Page, expect, Locator } from '@playwright/test';

/**
 * Helper functions for verifying UI state in the chat webview
 */
export class UIStateVerifier {
    constructor(private page: Page) {}

    /**
     * Get the chat container element
     */
    get messagesContainer(): Locator {
        return this.page.getByTestId('messages-container');
    }

    /**
     * Get the message input field
     */
    get messageInput(): Locator {
        return this.page.getByTestId('message-input');
    }

    /**
     * Get the send button
     */
    get sendButton(): Locator {
        return this.page.getByTestId('send-btn');
    }

    /**
     * Get the abort button
     */
    get abortButton(): Locator {
        return this.page.getByTestId('abort-btn');
    }

    /**
     * Get the clear chat button
     */
    get clearChatButton(): Locator {
        return this.page.getByTestId('clear-chat-btn');
    }

    /**
     * Get all message elements
     */
    get allMessages(): Locator {
        return this.messagesContainer.locator('.message');
    }

    /**
     * Get user messages only
     */
    get userMessages(): Locator {
        return this.messagesContainer.locator('.message.user');
    }

    /**
     * Get assistant messages only  
     */
    get assistantMessages(): Locator {
        return this.messagesContainer.locator('.message.assistant');
    }

    /**
     * Get streaming messages
     */
    get streamingMessages(): Locator {
        return this.messagesContainer.locator('.message.streaming');
    }

    /**
     * Get the latest message
     */
    get latestMessage(): Locator {
        return this.allMessages.last();
    }

    /**
     * Verify the number of messages displayed
     */
    async verifyMessageCount(expectedCount: number) {
        await expect(this.allMessages).toHaveCount(expectedCount);
    }

    /**
     * Verify message content at specific index
     */
    async verifyMessageContent(index: number, expectedContent: string) {
        const message = this.allMessages.nth(index);
        await expect(message.locator('.message-content')).toContainText(expectedContent);
    }

    /**
     * Verify latest message content
     */
    async verifyLatestMessageContent(expectedContent: string) {
        await expect(this.latestMessage.locator('.message-content')).toContainText(expectedContent);
    }

    /**
     * Verify message has specific role (user/assistant)
     */
    async verifyMessageRole(index: number, role: 'user' | 'assistant') {
        const message = this.allMessages.nth(index);
        await expect(message).toHaveClass(new RegExp(`message.*${role}`));
    }

    /**
     * Verify input field state
     */
    async verifyInputState(shouldBeEmpty: boolean = false, shouldBeDisabled: boolean = false) {
        if (shouldBeEmpty) {
            await expect(this.messageInput).toHaveValue('');
        }
        if (shouldBeDisabled) {
            await expect(this.messageInput).toBeDisabled();
        } else {
            await expect(this.messageInput).toBeEnabled();
        }
    }

    /**
     * Verify send button state
     */
    async verifySendButtonVisible(shouldBeVisible: boolean = true) {
        if (shouldBeVisible) {
            await expect(this.sendButton).toBeVisible();
        } else {
            await expect(this.sendButton).toBeHidden();
        }
    }

    /**
     * Verify abort button state
     */
    async verifyAbortButtonVisible(shouldBeVisible: boolean = false) {
        if (shouldBeVisible) {
            await expect(this.abortButton).toBeVisible();
        } else {
            await expect(this.abortButton).toBeHidden();
        }
    }

    /**
     * Verify streaming message exists (by checking if abort button is visible during streaming)
     */
    async verifyStreamingMessageExists() {
        // In the simplified model, streaming is indicated by abort button being visible
        // and having the expected message count
        await expect(this.abortButton).toBeVisible();
    }

    /**
     * Verify no streaming messages exist
     */
    async verifyNoStreamingMessages() {
        // No streaming means abort button is hidden
        await expect(this.abortButton).toBeHidden();
    }

    /**
     * Verify error message is displayed
     */
    async verifyErrorMessageDisplayed(errorText?: string) {
        const errorMessages = this.messagesContainer.locator('.error-message, .message.error');
        
        if (errorText) {
            // Check if any error message contains the specified text
            const matchingError = errorMessages.filter({ hasText: errorText });
            await expect(matchingError).toBeVisible();
        } else {
            // Just verify that at least one error message exists and is visible
            await expect(errorMessages.first()).toBeVisible();
        }
    }

    /**
     * Verify number of error messages
     */
    async verifyErrorMessageCount(expectedCount: number) {
        const errorMessages = this.messagesContainer.locator('.error-message, .message.error');
        await expect(errorMessages).toHaveCount(expectedCount);
    }

    /**
     * Verify chat is cleared (only welcome message remains)
     */
    async verifyChatCleared() {
        // Should have only the initial welcome message
        await this.verifyMessageCount(1);
        await this.verifyMessageContent(0, "您好！我是您的 AI 助手");
    }

    /**
     * Type message in input field
     */
    async typeMessage(message: string) {
        await this.messageInput.fill(message);
    }

    /**
     * Click send button
     */
    async clickSend() {
        await this.sendButton.click();
    }

    /**
     * Click abort button
     */
    async clickAbort() {
        await this.abortButton.click();
    }

    /**
     * Click clear chat button
     */
    async clickClearChat() {
        await this.clearChatButton.click();
    }

    /**
     * Verify clear chat button state
     */
    async verifyClearChatButtonEnabled(shouldBeEnabled: boolean = true) {
        if (shouldBeEnabled) {
            await expect(this.clearChatButton).toBeEnabled();
        } else {
            await expect(this.clearChatButton).toBeDisabled();
        }
    }

    /**
     * Send a complete message (type + send)
     */
    async sendMessage(message: string) {
        await this.typeMessage(message);
        await this.clickSend();
    }

    /**
     * Get the session selector dropdown
     */
    get sessionSelector(): Locator {
        return this.page.getByTestId('session-dropdown');
    }

    /**
     * Get session selector container
     */
    get sessionSelectorContainer(): Locator {
        return this.page.getByTestId('session-selector');
    }

    /**
     * Verify session selector state
     */
    async verifySessionSelectorValue(expectedValue: string) {
        await expect(this.sessionSelector).toHaveValue(expectedValue);
    }

    /**
     * Verify session selector has specific option
     */
    async verifySessionOption(sessionId: string, shouldExist: boolean = true) {
        const option = this.sessionSelector.locator(`option[value="${sessionId}"]`);
        if (shouldExist) {
            await expect(option).toHaveCount(1);
        } else {
            await expect(option).toHaveCount(0);
        }
    }

    /**
     * Select a session from dropdown
     */
    async selectSession(sessionId: string) {
        await this.sessionSelector.selectOption(sessionId);
    }

    /**
     * Get all session options
     */
    async getSessionOptions(): Promise<string[]> {
        return await this.sessionSelector.locator('option[value]:not([value=""])').evaluateAll(
            (elements) => elements.map(el => (el as HTMLOptionElement).value)
        );
    }

    /**
     * Verify session selector is disabled
     */
    async verifySessionSelectorDisabled(shouldBeDisabled: boolean = true) {
        if (shouldBeDisabled) {
            await expect(this.sessionSelector).toBeDisabled();
        } else {
            await expect(this.sessionSelector).toBeEnabled();
        }
    }

    /**
     * Verify session error is displayed
     */
    async verifySessionError(errorText?: string) {
        const sessionError = this.page.getByTestId('session-error');
        if (errorText) {
            await expect(sessionError).toContainText(errorText);
        } else {
            await expect(sessionError).toBeVisible();
        }
    }
}