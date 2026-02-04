import { test, expect } from '../utils/webviewTestHarness.js';

test.describe('Plugin Configuration UI Demo', () => {
    test('should show plugin tabs and content in configuration dialog', async ({ webviewPage }) => {
        // 1. Open the configuration dialog
        await webviewPage.evaluate(() => {
            (window as any).simulateExtensionMessage({
                command: 'showConfiguration',
                configurationData: {
                    apiKey: 'test-key',
                    baseURL: 'https://api.example.com',
                    agentModel: 'test-model',
                    fastModel: 'fast-model',
                    language: 'Chinese'
                }
            });
        });

        // Verify dialog is visible
        await expect(webviewPage.getByText('配置设置', { exact: true })).toBeVisible();
        
        // 2. Click on "插件" tab
        await webviewPage.getByText('插件', { exact: true }).click();
        
        // Verify plugin sub-tabs are visible
        await expect(webviewPage.getByText('探索新插件', { exact: true })).toBeVisible();
        await expect(webviewPage.getByText('已安装插件', { exact: true })).toBeVisible();
        await expect(webviewPage.getByText('插件市场', { exact: true })).toBeVisible();

        // 3. Simulate receiving plugins list
        await webviewPage.evaluate(() => {
            window.postMessage({
                command: 'listPluginsResponse',
                plugins: [
                    {
                        id: 'test-plugin@market1',
                        name: 'Test Plugin',
                        description: 'A sample plugin for testing',
                        marketplace: 'market1',
                        installed: false,
                        version: '1.0.0'
                    },
                    {
                        id: 'installed-plugin@market1',
                        name: 'Installed Plugin',
                        description: 'Already installed plugin',
                        marketplace: 'market1',
                        installed: true,
                        enabled: true,
                        version: '2.1.0'
                    }
                ]
            }, '*');
        });

        // Take screenshot of "Explore" tab
        await webviewPage.screenshot({ path: 'screenshots/plugins-explore-tab.png' });

        // 4. Switch to "已安装插件" tab
        await webviewPage.getByText('已安装插件', { exact: true }).click();
        await expect(webviewPage.locator('.plugin-name').filter({ hasText: 'Installed Plugin' })).toBeVisible();
        await webviewPage.screenshot({ path: 'screenshots/plugins-installed-tab.png' });

        // 5. Switch to "插件市场" tab
        await webviewPage.getByText('插件市场', { exact: true }).click();
        
        // Simulate receiving marketplaces list
        await webviewPage.evaluate(() => {
            window.postMessage({
                command: 'listMarketplacesResponse',
                marketplaces: [
                    { name: 'market1', url: 'https://github.com/owner/repo' }
                ]
            }, '*');
        });
        
        await expect(webviewPage.getByText('market1')).toBeVisible();
        await webviewPage.screenshot({ path: 'screenshots/plugins-marketplaces-tab.png' });
    });
});
