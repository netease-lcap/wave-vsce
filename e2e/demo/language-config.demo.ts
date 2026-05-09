import { test, expect } from '../utils/webviewTestHarness.js';

test.describe('Language Configuration Demo', () => {
    test('should show language field in configuration dialog', async ({ webviewPage }) => {
        // Simulate the extension sending the showConfiguration command with language
        await webviewPage.evaluate(() => {
            (window as any).simulateExtensionMessage({
                command: 'showConfiguration',
                configurationData: {
                    apiKey: 'test-key',
                    headers: '',
                    baseURL: 'https://api.example.com',
                    model: 'gemini-3-flash',
                    fastModel: 'gemini-2.5-flash',
                    backendLink: 'https://backend.example.com',
                    language: 'English'
                }
            });
        });

        // Check if the configuration dialog is visible
        await expect(webviewPage.getByText('配置设置', { exact: true })).toBeVisible();
        
        // Check if the language field is visible
        await expect(webviewPage.locator('label[for="language"]')).toBeVisible();
        await expect(webviewPage.locator('#language')).toHaveValue('English');
        
        // Verify it's a select and has options
        const select = webviewPage.locator('#language');
        const tagName = await select.evaluate(el => el.tagName.toLowerCase());
        expect(tagName).toBe('select');
        
        // Check options exist in DOM
        const chineseOption = select.locator('option[value="Chinese"]');
        const englishOption = select.locator('option[value="English"]');
        await expect(chineseOption).toBeAttached();
        await expect(englishOption).toBeAttached();
        
        // Take screenshot of the dialog only
        const dialog = webviewPage.locator('.configuration-dialog');
        await dialog.screenshot({ path: 'docs/public/screenshots/language-config-ui.png' });
    });
});
