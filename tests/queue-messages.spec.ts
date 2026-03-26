import { test, expect } from './utils/webviewTestHarness.js';

/**
 * Test message queuing functionality
 */

test.describe('Message Queuing', () => {
  test('should queue messages when streaming and process them after streaming ends', async ({ webviewPage }) => {
    const input = webviewPage.getByTestId('message-input');
    await input.focus();

    // 1. Start streaming
    await webviewPage.evaluate(() => {
      (window as any).simulateExtensionMessage({
        command: 'startStreaming'
      });
    });

    // 2. Verify send button shows "加入队列" and has list-ordered icon
    const sendBtn = webviewPage.getByTestId('send-btn');
    await expect(sendBtn).toHaveAttribute('title', '加入队列');
    const icon = sendBtn.locator('i');
    await expect(icon).toHaveClass(/codicon-list-ordered/);

    // 3. Type and send a message while streaming
    await input.type('Queued message 1');
    await sendBtn.click();

    // 4. Verify sendMessage was called (it should be called even when streaming, 
    // but the extension will handle the queuing)
    const sendMessageCalled = await webviewPage.evaluate(() => {
      const messages = (window as any).getTestMessages();
      return messages.some((m: any) => m.command === 'sendMessage' && m.text === 'Queued message 1');
    });
    expect(sendMessageCalled).toBe(true);

    // 5. Simulate queue update from extension
    await webviewPage.evaluate(() => {
      (window as any).simulateExtensionMessage({
        command: 'updateQueue',
        queue: [{ text: 'Queued message 1' }]
      });
    });

    // 6. Verify message is in the queue (visual check)
    const messagesContainer = webviewPage.getByTestId('messages-container');
    await expect(messagesContainer).toContainText('Queued message 1');
    await expect(messagesContainer).toContainText('已排队');

    // 7. End streaming
    await webviewPage.evaluate(() => {
      (window as any).simulateExtensionMessage({
        command: 'endStreaming'
      });
      // Also clear the queue as the extension would do when processing
      (window as any).simulateExtensionMessage({
        command: 'updateQueue',
        queue: []
      });
    });

    // 8. Verify queue is empty in UI
    await expect(messagesContainer).not.toContainText('已排队');
  });

  test('should clear queue when aborting', async ({ webviewPage }) => {
    const input = webviewPage.getByTestId('message-input');
    await input.focus();

    // 1. Start streaming and queue a message
    await webviewPage.evaluate(() => {
      (window as any).simulateExtensionMessage({
        command: 'startStreaming'
      });
      (window as any).simulateExtensionMessage({
        command: 'updateQueue',
        queue: [{ text: 'Queued message 1' }]
      });
    });

    const messagesContainer = webviewPage.getByTestId('messages-container');
    await expect(messagesContainer).toContainText('已排队');

    // 2. Click abort button
    const abortBtn = webviewPage.getByTestId('abort-btn');
    await abortBtn.click();

    // 3. Verify abortMessage was sent
    const abortMessageSent = await webviewPage.evaluate(() => {
      const messages = (window as any).getTestMessages();
      return messages.some((m: any) => m.command === 'abortMessage');
    });
    expect(abortMessageSent).toBe(true);

    // 4. Simulate queue cleared by extension
    await webviewPage.evaluate(() => {
      (window as any).simulateExtensionMessage({
        command: 'updateQueue',
        queue: []
      });
      (window as any).simulateExtensionMessage({
        command: 'endStreaming'
      });
    });

    // 5. Verify queue is empty in UI
    await expect(messagesContainer).not.toContainText('已排队');
  });

  test('should clear queue when pressing Escape', async ({ webviewPage }) => {
    const input = webviewPage.getByTestId('message-input');
    await input.focus();

    // 1. Start streaming and queue a message
    await webviewPage.evaluate(() => {
      (window as any).simulateExtensionMessage({
        command: 'startStreaming'
      });
      (window as any).simulateExtensionMessage({
        command: 'updateQueue',
        queue: [{ text: 'Queued message 1' }]
      });
    });

    const messagesContainer = webviewPage.getByTestId('messages-container');
    await expect(messagesContainer).toContainText('已排队');

    // 2. Press Escape
    await webviewPage.keyboard.press('Escape');

    // 3. Verify abortMessage was sent
    const abortMessageSent = await webviewPage.evaluate(() => {
      const messages = (window as any).getTestMessages();
      return messages.some((m: any) => m.command === 'abortMessage');
    });
    expect(abortMessageSent).toBe(true);

    // 4. Simulate queue cleared by extension
    await webviewPage.evaluate(() => {
      (window as any).simulateExtensionMessage({
        command: 'updateQueue',
        queue: []
      });
      (window as any).simulateExtensionMessage({
        command: 'endStreaming'
      });
    });

    // 5. Verify queue is empty in UI
    await expect(messagesContainer).not.toContainText('已排队');
  });
});
