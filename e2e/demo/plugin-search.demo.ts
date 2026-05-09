import { test, expect } from '../utils/webviewTestHarness.js';

test.describe('Plugin Search UI Demo', () => {
    test('should show search input and filter plugins by keyword', async ({ webviewPage }) => {
        // 1. Open the configuration dialog
        await webviewPage.evaluate(() => {
            (window as any).simulateExtensionMessage({
                command: 'showConfiguration',
                configurationData: {
                    apiKey: 'test-key',
                    baseURL: 'https://api.example.com',
                    model: 'test-model',
                    fastModel: 'fast-model',
                    language: 'Chinese'
                }
            });
        });

        await expect(webviewPage.getByText('配置设置', { exact: true })).toBeVisible();

        // 2. Click on "插件" tab
        await webviewPage.getByText('插件', { exact: true }).click();

        // 3. Simulate receiving plugins list
        await webviewPage.evaluate(() => {
            window.postMessage({
                command: 'listPluginsResponse',
                plugins: [
                    {
                        id: 'commit-commands@wave-plugins-official',
                        name: 'commit-commands',
                        description: 'Commands for git commit workflows',
                        marketplace: 'wave-plugins-official',
                        installed: false,
                        version: '1.0.0'
                    },
                    {
                        id: 'document-skills@wave-plugins-official',
                        name: 'document-skills',
                        description: 'Document processing suite including Excel and Word',
                        marketplace: 'wave-plugins-official',
                        installed: false,
                        version: '1.0.0'
                    },
                    {
                        id: 'typescript-lsp@wave-plugins-official',
                        name: 'typescript-lsp',
                        description: 'TypeScript language server for code intelligence',
                        marketplace: 'wave-plugins-official',
                        installed: false,
                        version: '1.0.0'
                    },
                    {
                        id: 'chrome-headless@wave-plugins-official',
                        name: 'chrome-headless',
                        description: 'Chrome DevTools Protocol for browser automation',
                        marketplace: 'wave-plugins-official',
                        installed: false,
                        version: '1.0.0'
                    }
                ]
            }, '*');
        });

        // 4. Verify search input is visible
        const searchInput = webviewPage.locator('.plugin-search input');
        await expect(searchInput).toBeVisible();
        await expect(searchInput).toHaveAttribute('placeholder', '搜索插件...');

        // Screenshot of search input with all plugins
        await webviewPage.screenshot({ path: 'docs/public/screenshots/plugin-search-input.png' });

        // 5. Type "commit" to filter
        await searchInput.fill('commit');

        // Verify only commit-commands is shown
        await expect(webviewPage.locator('.plugin-name', { hasText: 'commit-commands' })).toBeVisible();
        await expect(webviewPage.locator('.plugin-name', { hasText: 'document-skills' })).not.toBeVisible();
        await expect(webviewPage.locator('.plugin-name', { hasText: 'typescript-lsp' })).not.toBeVisible();
        await expect(webviewPage.locator('.plugin-name', { hasText: 'chrome-headless' })).not.toBeVisible();

        await webviewPage.screenshot({ path: 'docs/public/screenshots/plugin-search-filtered.png' });

        // 6. Type a non-matching query
        await searchInput.fill('zzz-nonexistent');
        await expect(webviewPage.getByText('没有找到匹配的插件')).toBeVisible();

        await webviewPage.screenshot({ path: 'docs/public/screenshots/plugin-search-no-results.png' });

        // 7. Clear the search
        await searchInput.fill('');
        await expect(webviewPage.locator('.plugin-name', { hasText: 'commit-commands' })).toBeVisible();
        await expect(webviewPage.locator('.plugin-name', { hasText: 'document-skills' })).toBeVisible();
    });
});
