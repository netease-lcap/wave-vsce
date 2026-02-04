import { test, expect } from '../utils/webviewTestHarness.js';

test.describe('Plugin Management Screenshots', () => {
    test('capture plugin management features', async ({ webviewPage }) => {
        // Set viewport size for better screenshots
        await webviewPage.setViewportSize({ width: 500, height: 700 });

        // 1. Open configuration dialog
        await webviewPage.evaluate(() => {
            (window as any).simulateExtensionMessage({
                command: 'setInitialState',
                messages: [],
                isStreaming: false,
                sessions: [],
                configurationData: {
                    apiKey: 'sk-xxxxxxxxxxxxxxxx',
                    baseURL: 'https://api.openai.com/v1',
                    agentModel: 'gpt-4',
                    fastModel: 'gpt-3.5-turbo',
                    language: 'Chinese'
                },
                permissionMode: 'default'
            });
        });

        // Click configuration button
        await webviewPage.click('.configuration-button');
        await webviewPage.waitForSelector('.configuration-dialog');
        
        // 2. Click "插件" tab
        await webviewPage.getByText('插件', { exact: true }).click();
        await expect(webviewPage.getByText('探索新插件', { exact: true })).toBeVisible();

        // 3. Explore plugins tab - 展示可安装的插件列表和作用域选择
        await webviewPage.evaluate(() => {
            window.postMessage({
                command: 'listPluginsResponse',
                plugins: [
                    {
                        id: 'github-plugin@official',
                        name: 'GitHub Integration',
                        description: '集成 GitHub API，支持仓库管理、Issue 追踪和 PR 审查',
                        marketplace: 'official',
                        installed: false,
                        version: '1.2.3'
                    },
                    {
                        id: 'docker-helper@official',
                        name: 'Docker Helper',
                        description: '简化 Docker 容器和镜像的管理，提供常用命令快捷方式',
                        marketplace: 'official',
                        installed: false,
                        version: '2.0.1'
                    },
                    {
                        id: 'database-tools@community',
                        name: 'Database Tools',
                        description: '连接和查询多种数据库（MySQL、PostgreSQL、MongoDB 等）',
                        marketplace: 'community',
                        installed: false,
                        version: '0.9.5'
                    },
                    {
                        id: 'code-reviewer@official',
                        name: 'Code Reviewer',
                        description: '智能代码审查工具，提供最佳实践建议和代码质量分析',
                        marketplace: 'official',
                        installed: true,
                        enabled: true,
                        version: '1.5.0',
                        scope: 'user'
                    },
                    {
                        id: 'markdown-enhancer@community',
                        name: 'Markdown Enhancer',
                        description: '增强 Markdown 处理能力，支持高级格式化和预览',
                        marketplace: 'community',
                        installed: true,
                        enabled: false,
                        version: '1.1.2',
                        scope: 'project'
                    }
                ]
            }, '*');
        });

        await webviewPage.waitForSelector('.plugin-item');
        
        // 确保作用域选择器可见
        await expect(webviewPage.getByText('安装作用域:')).toBeVisible();
        await expect(webviewPage.locator('select').filter({ hasText: 'User' })).toBeVisible();
        
        // 截图：探索新插件标签页，显示作用域选择器和可安装插件列表
        await webviewPage.screenshot({ path: 'screenshots/spec-plugin-explore.png' });

        // 4. Installed plugins tab - 展示已安装插件及启用/禁用开关
        await webviewPage.getByText('已安装插件', { exact: true }).click();
        
        // 等待已安装插件渲染
        await webviewPage.waitForSelector('.plugin-item:has-text("Code Reviewer")');
        
        // 截图：已安装插件标签页，显示启用/禁用开关
        await webviewPage.screenshot({ path: 'screenshots/spec-plugin-installed.png' });

        // 5. Marketplaces tab - 展示插件市场管理
        await webviewPage.getByText('插件市场', { exact: true }).click();
        
        // Simulate marketplace list
        await webviewPage.evaluate(() => {
            window.postMessage({
                command: 'listMarketplacesResponse',
                marketplaces: [
                    { 
                        name: 'official', 
                        url: 'https://github.com/wave-ai/official-plugins' 
                    },
                    { 
                        name: 'community', 
                        url: 'https://github.com/wave-community/plugins' 
                    },
                    { 
                        name: 'my-custom', 
                        url: '/home/user/my-local-plugins' 
                    }
                ]
            }, '*');
        });

        await webviewPage.waitForSelector('.marketplace-item');
        
        // 确保输入框和按钮可见
        await expect(webviewPage.locator('input[placeholder*="市场 URL"]')).toBeVisible();
        await expect(webviewPage.getByText('添加', { exact: true })).toBeVisible();
        
        // 截图：插件市场标签页，显示市场列表和管理功能
        await webviewPage.screenshot({ path: 'screenshots/spec-plugin-marketplaces.png' });

        // Close the dialog
        await webviewPage.keyboard.press('Escape');
    });
});
