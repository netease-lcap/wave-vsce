import { test, expect } from '../utils/webviewTestHarness.js';

test.describe('Input Auto Resize', () => {
  test('should increase input height when typing multiple lines', async ({ webviewPage }) => {
    const input = webviewPage.getByTestId('message-input');
    await input.focus();

    // Get initial height
    const initialHeight = await input.evaluate(el => el.clientHeight);

    // Type a single line
    await input.type('first line');
    await webviewPage.waitForTimeout(50);
    const afterFirstLineHeight = await input.evaluate(el => el.clientHeight);

    // Height should not change significantly for single line (within padding tolerance)
    expect(afterFirstLineHeight - initialHeight).toBeLessThan(5);

    // Press Shift+Enter to add a new line
    await input.press('Shift+Enter');
    await input.type('second line');
    await webviewPage.waitForTimeout(50);
    const afterSecondLineHeight = await input.evaluate(el => el.clientHeight);

    // Height should have increased
    expect(afterSecondLineHeight).toBeGreaterThan(afterFirstLineHeight);

    // Add another line
    await input.press('Shift+Enter');
    await input.type('third line');
    await webviewPage.waitForTimeout(50);
    const afterThirdLineHeight = await input.evaluate(el => el.clientHeight);

    // Height should have increased again
    expect(afterThirdLineHeight).toBeGreaterThan(afterSecondLineHeight);
  });

  test('should increase input height when pasting multiline text', async ({ webviewPage }) => {
    const input = webviewPage.getByTestId('message-input');
    await input.focus();

    // Get initial height
    const initialHeight = await input.evaluate(el => el.clientHeight);

    // Simulate pasting multiline text via evaluate
    await input.evaluate((el: HTMLElement, text: string) => {
      el.innerText = text;
      const inputEvent = new Event('input', { bubbles: true });
      el.dispatchEvent(inputEvent);
    }, 'line1\nline2\nline3\nline4\nline5');

    await webviewPage.waitForTimeout(50);
    const afterPasteHeight = await input.evaluate(el => el.clientHeight);

    // Height should have increased
    expect(afterPasteHeight).toBeGreaterThan(initialHeight);

    // Verify the content is there
    const content = await input.textContent();
    expect(content).toContain('line1');
    expect(content).toContain('line5');
  });

  test('should decrease height back when content is cleared', async ({ webviewPage }) => {
    const input = webviewPage.getByTestId('message-input');
    await input.focus();

    // Add multiple lines
    await input.type('line1');
    await input.press('Shift+Enter');
    await input.type('line2');
    await input.press('Shift+Enter');
    await input.type('line3');
    await webviewPage.waitForTimeout(50);

    const expandedHeight = await input.evaluate(el => el.clientHeight);

    // Clear the input
    await input.evaluate((el: HTMLElement) => {
      el.innerText = '';
      const inputEvent = new Event('input', { bubbles: true });
      el.dispatchEvent(inputEvent);
    });

    await webviewPage.waitForTimeout(50);
    const clearedHeight = await input.evaluate(el => el.clientHeight);

    // Height should have decreased
    expect(clearedHeight).toBeLessThan(expandedHeight);
  });

  test('should reset input height after sending message', async ({ webviewPage }) => {
    const input = webviewPage.getByTestId('message-input');
    const sendBtn = webviewPage.getByTestId('send-btn');
    await input.focus();

    // Get initial height
    const initialHeight = await input.evaluate(el => el.clientHeight);

    // Add multiple lines to expand the input
    await input.type('line1');
    await input.press('Shift+Enter');
    await input.type('line2');
    await input.press('Shift+Enter');
    await input.type('line3');
    await webviewPage.waitForTimeout(50);

    const expandedHeight = await input.evaluate(el => el.clientHeight);
    expect(expandedHeight).toBeGreaterThan(initialHeight);

    // Send the message
    await sendBtn.click();
    await webviewPage.waitForTimeout(100);

    // Height should reset back to initial
    const afterSendHeight = await input.evaluate(el => el.clientHeight);
    expect(afterSendHeight).toBeLessThan(expandedHeight);
    expect(afterSendHeight).toBe(initialHeight);
  });
});
