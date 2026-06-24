import { test, expect } from '../utils/webviewTestHarness.js';

test.describe('Model Dialog Demo', () => {
    test('should show model dialog with pre-filled values', async ({ webviewPage }) => {
        // 1. Open the model dialog via showDialog
        await webviewPage.evaluate(() => {
            (window as any).simulateExtensionMessage({
                command: 'showDialog',
                dialogType: 'model'
            });
        });

        // 2. Simulate extension sending configuration data
        await webviewPage.evaluate(() => {
            (window as any).simulateExtensionMessage({
                command: 'configurationResponse',
                configurationData: {
                    model: 'claude-sonnet-4-20250514',
                    fastModel: 'claude-haiku-4-20250514'
                }
            });
        });

        // Verify dialog is visible
        await expect(webviewPage.getByText('模型设置', { exact: true })).toBeVisible();

        // Verify model input is pre-filled
        await expect(webviewPage.locator('#model-select')).toHaveValue('claude-sonnet-4-20250514');
        await expect(webviewPage.locator('#fast-model-select')).toHaveValue('claude-haiku-4-20250514');

        // Take screenshot
        const dialog = webviewPage.locator('.configuration-dialog');
        await dialog.screenshot({ path: 'docs/public/screenshots/spec-model-dialog.png' });
    });

    test('should show model dialog with empty values and env placeholders', async ({ webviewPage }) => {
        await webviewPage.evaluate(() => {
            (window as any).simulateExtensionMessage({
                command: 'showDialog',
                dialogType: 'model'
            });
        });

        await webviewPage.evaluate(() => {
            (window as any).simulateExtensionMessage({
                command: 'configurationResponse',
                configurationData: {
                    model: '',
                    fastModel: '',
                    envModel: 'WAVE_MODEL',
                    envFastModel: 'WAVE_FAST_MODEL'
                }
            });
        });

        await expect(webviewPage.getByText('模型设置', { exact: true })).toBeVisible();

        // Verify placeholders are shown
        const modelInput = webviewPage.locator('#model-select');
        await expect(modelInput).toHaveAttribute('placeholder', /WAVE_MODEL/);

        const dialog = webviewPage.locator('.configuration-dialog');
        await dialog.screenshot({ path: 'docs/public/screenshots/spec-model-dialog-empty.png' });
    });
});
