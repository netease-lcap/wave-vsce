import { test, expect } from '../utils/webviewTestHarness.js';
import { MessageInjector } from '../utils/messageInjector.js';
import { ASK_USER_QUESTION_TOOL_NAME } from 'wave-agent-sdk/dist/constants/tools.js';

test.describe('AskUserQuestion Newline Support', () => {
    test('should support newlines in question and answer', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);

        // 1. Simulate an AskUserQuestion with newlines in the question
        const questionWithNewlines = 'This is a question\nwith multiple lines.\nDoes it work?';
        await injector.simulateExtensionMessage('showConfirmation', {
            confirmationId: 'test_ask_newline',
            toolName: ASK_USER_QUESTION_TOOL_NAME,
            confirmationType: '用户询问',
            toolInput: {
                questions: [{
                    header: 'TEST',
                    question: questionWithNewlines,
                    options: [
                        { label: 'Option 1', description: 'Desc 1' },
                        { label: 'Option 2\nwith newline', description: 'Desc 2\nwith newline' }
                    ],
                    multiSelect: false
                }]
            }
        });

        // Verify question text has pre-wrap
        const questionText = webviewPage.locator('.question-text');
        await expect(questionText).toBeVisible();
        await expect(questionText).toHaveText(questionWithNewlines);
        const whiteSpace = await questionText.evaluate(el => window.getComputedStyle(el).whiteSpace);
        expect(whiteSpace).toBe('pre-wrap');

        // Verify option label and description have pre-wrap
        const option2 = webviewPage.locator('.option-item').nth(1);
        const optionLabel = option2.locator('.option-label');
        const optionDesc = option2.locator('.option-description');
        expect(await optionLabel.evaluate(el => window.getComputedStyle(el).whiteSpace)).toBe('pre-wrap');
        expect(await optionDesc.evaluate(el => window.getComputedStyle(el).whiteSpace)).toBe('pre-wrap');

        // 2. Test "Other" input with newlines
        const otherOption = webviewPage.locator('.other-option');
        await otherOption.click();
        
        const textarea = webviewPage.locator('.other-text-input');
        await expect(textarea).toBeVisible();
        
        // Type something and press Shift+Enter
        await textarea.focus();
        await webviewPage.keyboard.type('Line 1');
        await webviewPage.keyboard.press('Shift+Enter');
        await webviewPage.keyboard.type('Line 2');
        
        // Verify content has newline
        const value = await textarea.inputValue();
        expect(value).toBe('Line 1\nLine 2');
        
        // Press Enter (should submit)
        await webviewPage.keyboard.press('Enter');
        
        // Verify confirmation dialog is hidden
        await expect(webviewPage.locator('.confirmation-dialog')).not.toBeVisible();

        // 3. Verify the result display in the message history
        const answerWithNewlines = 'Line 1\nLine 2';
        const toolResult = JSON.stringify({ [questionWithNewlines]: answerWithNewlines });
        await injector.updateMessages([
            {
                role: 'assistant',
                blocks: [
                    {
                        type: 'tool',
                        name: ASK_USER_QUESTION_TOOL_NAME,
                        id: 'call_1',
                        parameters: JSON.stringify({ questions: [] }),
                        result: toolResult,
                        stage: 'end'
                    }
                ]
            }
        ]);

        const resultA = webviewPage.locator('.ask-user-result-a');
        await expect(resultA).toBeVisible();
        await expect(resultA).toHaveText(answerWithNewlines);
        const resultAWhiteSpace = await resultA.evaluate(el => window.getComputedStyle(el).whiteSpace);
        expect(resultAWhiteSpace).toBe('pre-wrap');
        
        const resultQ = webviewPage.locator('.ask-user-result-q');
        await expect(resultQ).toBeVisible();
        await expect(resultQ).toHaveText(questionWithNewlines);
        const resultQWhiteSpace = await resultQ.evaluate(el => window.getComputedStyle(el).whiteSpace);
        expect(resultQWhiteSpace).toBe('pre-wrap');
    });

    test('should support automatic wrapping for long text', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);

        // A very long string without spaces to test word breaking
        const longString = 'ThisIsAVeryLongStringWithoutSpacesThatShouldBreakAndWrapToTheNextLineOtherwiseItWillOverflowTheContainerAndLookBadInTheUI'.repeat(3);
        
        await injector.simulateExtensionMessage('showConfirmation', {
            confirmationId: 'test_ask_wrap',
            toolName: ASK_USER_QUESTION_TOOL_NAME,
            confirmationType: '用户询问',
            toolInput: {
                questions: [{
                    header: 'WRAP_TEST',
                    question: longString,
                    options: [
                        { label: 'Short', description: 'Short desc' },
                        { label: 'LongOption' + longString, description: 'LongDesc' + longString }
                    ],
                    multiSelect: false
                }]
            }
        });

        // Verify question text has overflow-wrap or word-break
        const questionText = webviewPage.locator('.question-text');
        await expect(questionText).toBeVisible();
        const overflowWrap = await questionText.evaluate(el => window.getComputedStyle(el).overflowWrap);
        expect(overflowWrap === 'anywhere' || overflowWrap === 'break-word').toBe(true);

        // Verify it doesn't overflow the container width
        const containerWidth = await webviewPage.locator('.confirmation-dialog-inner').evaluate(el => el.clientWidth);
        const textWidth = await questionText.evaluate(el => el.clientWidth);
        expect(textWidth).toBeLessThanOrEqual(containerWidth);

        // Submit with long "Other" input
        const otherOption = webviewPage.locator('.other-option');
        await otherOption.click();
        const textarea = webviewPage.locator('.other-text-input');
        await textarea.fill(longString);
        await webviewPage.locator('.confirmation-btn-apply').click();

        // Verify result display wrapping
        await injector.updateMessages([
            {
                role: 'assistant',
                blocks: [
                    {
                        type: 'tool',
                        name: ASK_USER_QUESTION_TOOL_NAME,
                        id: 'call_wrap',
                        parameters: JSON.stringify({ questions: [] }),
                        result: JSON.stringify({ [longString]: longString }),
                        stage: 'end'
                    }
                ]
            }
        ]);

        const resultA = webviewPage.locator('.ask-user-result-a');
        await expect(resultA).toBeVisible();
        const resultAWidth = await resultA.evaluate(el => el.clientWidth);
        const messageWidth = await webviewPage.locator('.message').last().evaluate(el => el.clientWidth);
        expect(resultAWidth).toBeLessThanOrEqual(messageWidth);
        
        const resultAOverflowWrap = await resultA.evaluate(el => window.getComputedStyle(el).overflowWrap);
        expect(resultAOverflowWrap === 'anywhere' || resultAOverflowWrap === 'break-word').toBe(true);
    });
});
