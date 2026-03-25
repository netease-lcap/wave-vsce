import { test, expect } from '../utils/webviewTestHarness.js';
import { MessageInjector } from '../utils/messageInjector.js';
import { UIStateVerifier } from '../utils/uiStateVerifier.js';
import { MockDataGenerator } from '../fixtures/mockData.js';
import { 
    EDIT_TOOL_NAME, 
    BASH_TOOL_NAME,
    ASK_USER_QUESTION_TOOL_NAME,
    EXIT_PLAN_MODE_TOOL_NAME,
    GLOB_TOOL_NAME,
    GREP_TOOL_NAME,
    READ_TOOL_NAME,
    WRITE_TOOL_NAME,
    AGENT_TOOL_NAME,
    type Message,
    type SessionMetadata
} from 'wave-agent-sdk';

test.describe('Product Specification Screenshots', () => {
    test('capture all features', async ({ webviewPage }) => {
        const injector = new MessageInjector(webviewPage);
        const ui = new UIStateVerifier(webviewPage);

        // Set viewport size for better screenshots (simulating VS Code sidebar)
        await webviewPage.setViewportSize({ width: 400, height: 800 });

        // Provide initial state with valid configuration
        await injector.simulateExtensionMessage('setInitialState', {
            messages: [],
            isStreaming: false,
            sessions: [],
            configurationData: {
                authMethod: 'apiKey',
                apiKey: 'sk-xxxxxxxxxxxxxxxx',
                baseURL: 'https://api.openai.com/v1',
                agentModel: 'gpt-4',
                fastModel: 'gpt-3.5-turbo'
            },
            permissionMode: 'default'
        });

        // 1. Welcome Message
        await ui.verifyMessageCount(1);
        await webviewPage.screenshot({ path: 'screenshots/spec-welcome.png' });

        // 2. Basic Chat (Markdown & Code)
        const basicChat = [
            MockDataGenerator.createUserMessage('如何写一个 Hello World?'),
            MockDataGenerator.createAssistantMessage('在 TypeScript 中，你可以这样写：\n\n```typescript\nconsole.log("Hello, World!");\n```\n\n你可以使用 `tsc` 编译它。')
        ];
        await injector.updateMessages(basicChat);
        await injector.endStreaming();
        await webviewPage.screenshot({ path: 'screenshots/spec-basic-chat.png' });

        // 3. Slash Commands
        await injector.updateMessages([]);
        await webviewPage.focus('[data-testid="message-input"]');
        await webviewPage.keyboard.type('/');
        
        // Wait for the request to be sent to the extension
        await webviewPage.waitForFunction(() => {
            const messages = (window as any).getTestMessages ? (window as any).getTestMessages() : [];
            return messages.some((m: any) => m.command === 'requestSlashCommands');
        });

        await injector.simulateExtensionMessage('slashCommandsResponse', {
            commands: [
                { id: 'explain', name: 'explain', description: '解释选中的代码' },
                { id: 'fix', name: 'fix', description: '修复代码中的问题' },
                { id: 'test', name: 'test', description: '为代码生成单元测试' }
            ]
        });

        await webviewPage.waitForSelector('.slash-command-item', { state: 'visible', timeout: 5000 });
        await webviewPage.screenshot({ path: 'screenshots/spec-slash-commands.png' });
        await webviewPage.keyboard.press('Escape');

        // 4. File Suggestions (@)
        await webviewPage.focus('[data-testid="message-input"]');
        await webviewPage.keyboard.press('Control+A');
        await webviewPage.keyboard.press('Backspace');
        await webviewPage.keyboard.type('@');
        
        // Wait for the request to be sent and get the requestId
        const requestId = await webviewPage.evaluate(async () => {
            const poll = () => new Promise(resolve => {
                const check = () => {
                    const messages = (window as any).getTestMessages ? (window as any).getTestMessages() : [];
                    const reqs = messages.filter((m: any) => m.command === 'requestFileSuggestions');
                    if (reqs.length > 0) resolve(reqs[reqs.length - 1].requestId);
                    else setTimeout(check, 50);
                };
                check();
            });
            return await poll();
        });

        await injector.simulateExtensionMessage('fileSuggestionsResponse', {
            requestId: requestId,
            filterText: '',
            suggestions: [
                { path: 'src', relativePath: 'src', name: 'src', icon: 'codicon-folder' },
                { path: 'src/main.ts', relativePath: 'src/main.ts', name: 'main.ts', icon: 'codicon-file-code' },
                { path: 'package.json', relativePath: 'package.json', name: 'package.json', icon: 'codicon-json' },
                { path: 'tsconfig.json', relativePath: 'tsconfig.json', name: 'tsconfig.json', icon: 'codicon-json' }
            ]
        });

        await webviewPage.waitForSelector('.suggestion-item', { state: 'visible', timeout: 5000 });
        await webviewPage.screenshot({ path: 'screenshots/spec-file-suggestions.png' });
        await webviewPage.keyboard.press('Escape');
        await webviewPage.keyboard.press('Control+A');
        await webviewPage.keyboard.press('Backspace');

        // 5. Mermaid Diagrams
        const mermaidChat = [
            MockDataGenerator.createAssistantMessage('这是一个系统架构图：\n\n```mermaid\ngraph TD\n    User --> WebApp\n    WebApp --> API\n    API --> DB[(Database)]\n```')
        ];
        await injector.updateMessages(mermaidChat);
        await injector.endStreaming();
        await webviewPage.waitForSelector('.mermaid-container svg');
        await webviewPage.screenshot({ path: 'screenshots/spec-mermaid.png' });

        // 6. Diff Viewer - 使用 MockDataGenerator 的 Edit 工具
        const diffMessage: Message = {
            role: 'assistant',
            blocks: [
                {
                    type: 'tool',
                    name: EDIT_TOOL_NAME,
                    stage: 'end',
                    compactParams: 'src/main.ts',
                    parameters: JSON.stringify({
                        file_path: 'src/main.ts',
                        old_string: 'console.log("Hello, World!");',
                        new_string: 'console.log("Hello, Wave!");'
                    }),
                    result: 'Text replaced successfully'
                }
            ]
        };
        await injector.updateMessages([diffMessage]);
        await webviewPage.waitForSelector('.tool-container');
        await webviewPage.screenshot({ path: 'screenshots/spec-diff-viewer.png' });

        // 7. Task List
        await injector.simulateExtensionMessage('updateTasks', {
            tasks: [
                { id: '1', subject: '搜索相关文件', description: '查找项目中与任务列表相关的组件和样式文件', status: 'completed', blocks: [], blockedBy: [], metadata: {} },
                { id: '2', subject: '实现任务列表组件', description: '编写 React 组件和 CSS 样式', status: 'in_progress', activeForm: '编写 CSS', blocks: ['3'], blockedBy: [], metadata: {} },
                { id: '3', subject: '运行测试', description: '确保新功能正常工作且不影响现有功能', status: 'pending', blocks: [], blockedBy: ['2'], metadata: {} }
            ]
        });
        await webviewPage.waitForSelector('.task-list-container');
        await webviewPage.screenshot({ path: 'screenshots/spec-task-list.png' });

        // 8. Subagent Display (Task Explore)
        const subagentMessage: Message = {
            role: 'assistant',
            blocks: [
                {
                    type: 'tool',
                    name: AGENT_TOOL_NAME,
                    stage: 'running',
                    compactParams: 'Explore: 查找所有 API 定义',
                    parameters: JSON.stringify({ subagent_type: 'Explore', description: '查找所有 API 定义', prompt: '...' }),
                    shortResult: '...Read, Write (2 tools | 1,234 tokens)'
                }
            ]
        };
        await injector.updateMessages([subagentMessage]);
        
        await webviewPage.waitForSelector('.tool-container');
        await webviewPage.screenshot({ path: 'screenshots/spec-subagent.png' });

        // 9. Bash Tool - 使用 MockDataGenerator
        const bashMessage: Message = {
            role: 'assistant',
            blocks: [
                {
                    type: 'tool',
                    name: BASH_TOOL_NAME,
                    stage: 'end',
                    compactParams: '运行测试',
                    parameters: JSON.stringify({ command: 'npm test', description: '运行测试' }),
                    result: 'PASS  tests/index.test.ts\n  ✓ should work (5ms)\n\nTest Suites: 1 passed, 1 total\nTests:       1 passed, 1 total\nSnapshots:   0 total\nTime:        1.2s'
                }
            ]
        };
        await injector.updateMessages([bashMessage]);
        await webviewPage.waitForSelector('.bash-command-unified');
        await webviewPage.screenshot({ path: 'screenshots/spec-bash.png' });

        // 10. Ask User Question - 显示确认对话框
        const askUserMessage: Message = {
            role: 'assistant',
            blocks: [
                {
                    type: 'tool',
                    name: ASK_USER_QUESTION_TOOL_NAME,
                    stage: 'running',
                    parameters: JSON.stringify({
                        questions: [
                            {
                                header: '选择框架',
                                question: '你想使用哪个前端框架？',
                                options: [
                                    { label: 'React', description: '流行的 UI 库' },
                                    { label: 'Vue', description: '渐进式框架' }
                                ]
                            }
                        ]
                    })
                }
            ]
        };
        await injector.updateMessages([askUserMessage]);
        
        // 显示确认对话框
        await injector.simulateExtensionMessage('showConfirmation', {
            confirmationId: 'ask-user-123',
            toolName: ASK_USER_QUESTION_TOOL_NAME,
            confirmationType: '问题待回答',
            toolInput: {
                questions: [
                    {
                        header: '选择框架',
                        question: '你想使用哪个前端框架？',
                        options: [
                            { label: 'React', description: '流行的 UI 库' },
                            { label: 'Vue', description: '渐进式框架' }
                        ]
                    }
                ]
            }
        });
        
        await webviewPage.waitForSelector('.confirmation-dialog');
        await webviewPage.screenshot({ path: 'screenshots/spec-ask-user.png' });
        
        // 关闭确认对话框以便继续其他截图
        await webviewPage.keyboard.press('Escape');
        await webviewPage.waitForSelector('.confirmation-dialog', { state: 'hidden' });

        // 11. Configuration Dialog
        // Update config
        await injector.simulateExtensionMessage('configurationResponse', {
            configurationData: {
                authMethod: 'apiKey',
                apiKey: 'sk-xxxxxxxxxxxxxxxx',
                baseURL: 'https://api.openai.com/v1',
                agentModel: 'gpt-4',
                fastModel: 'gpt-3.5-turbo'
            }
        });
        await webviewPage.click('.configuration-button');
        await webviewPage.waitForSelector('.configuration-dialog');
        await webviewPage.screenshot({ path: 'screenshots/spec-configuration.png' });
        await webviewPage.keyboard.press('Escape');
        await webviewPage.waitForSelector('.configuration-dialog', { state: 'hidden' });

        // 12. Permission Mode Toggle - Show all three modes
        const inputContainer = webviewPage.locator('.input-container');
        
        // Mode 1: Default (修改前询问)
        await injector.simulateExtensionMessage('updatePermissionMode', {
            mode: 'default'
        });
        await webviewPage.waitForSelector('.permission-mode-toggle:has-text("修改前询问")');
        
        // Click to show dropdown
        await webviewPage.click('.permission-mode-toggle');
        await webviewPage.waitForSelector('.permission-mode-dropdown', { state: 'visible', timeout: 5000 });
        await webviewPage.screenshot({ path: 'screenshots/spec-permission-mode-default.png' });
        await webviewPage.click('.permission-mode-toggle'); // Click again to close
        await webviewPage.waitForSelector('.permission-mode-dropdown', { state: 'hidden', timeout: 5000 });

        // Mode 2: Accept Edits (自动接受修改)
        await injector.simulateExtensionMessage('updatePermissionMode', {
            mode: 'acceptEdits'
        });
        await webviewPage.waitForSelector('.permission-mode-toggle:has-text("自动接受修改")');
        
        // Click to show dropdown
        await webviewPage.click('.permission-mode-toggle');
        await webviewPage.waitForSelector('.permission-mode-dropdown', { state: 'visible', timeout: 5000 });
        await webviewPage.screenshot({ path: 'screenshots/spec-permission-mode-accept.png' });
        await webviewPage.click('.permission-mode-toggle'); // Click again to close
        await webviewPage.waitForSelector('.permission-mode-dropdown', { state: 'hidden', timeout: 5000 });

        // Mode 3: Plan Mode (计划模式)
        await injector.simulateExtensionMessage('updatePermissionMode', {
            mode: 'plan'
        });
        await webviewPage.waitForSelector('.permission-mode-toggle:has-text("计划模式")');
        
        // Click to show dropdown
        await webviewPage.click('.permission-mode-toggle');
        await webviewPage.waitForSelector('.permission-mode-dropdown', { state: 'visible', timeout: 5000 });
        await webviewPage.screenshot({ path: 'screenshots/spec-permission-mode-plan.png' });
        await webviewPage.click('.permission-mode-toggle'); // Click again to close
        await webviewPage.waitForSelector('.permission-mode-dropdown', { state: 'hidden', timeout: 5000 });

        // Reset to default for remaining screenshots
        await injector.simulateExtensionMessage('updatePermissionMode', {
            mode: 'default'
        });
        await webviewPage.waitForSelector('.permission-mode-toggle:has-text("修改前询问")');
        
        // 13. Selection Reference
        await injector.updateMessages([
            {
                role: 'user',
                blocks: [
                    {
                        type: 'text',
                        content: '解释这段代码：\n\n[Selection: src/app.ts#10-15]\n```\nconst app = express();\napp.get("/", (req, res) => {\n  res.send("Hello World");\n});\n```'
                    }
                ]
            }
        ]);
        await webviewPage.screenshot({ path: 'screenshots/spec-selection.png' });

        // 14. Session Selector - 使用 SDK 的 SessionMetadata 类型
        const now = Date.now();
        const sessions: SessionMetadata[] = [
            { 
                id: 'session-1',
                sessionType: 'main',
                workdir: '/project',
                lastActiveAt: new Date(now - 1000 * 60 * 30), // 30分钟前
                latestTotalTokens: 1500
            },
            { 
                id: 'session-2',
                sessionType: 'main', 
                workdir: '/project',
                lastActiveAt: new Date(now - 1000 * 60 * 60 * 2), // 2小时前
                latestTotalTokens: 2200
            },
            { 
                id: 'session-3',
                sessionType: 'main',
                workdir: '/project', 
                lastActiveAt: new Date(now - 1000 * 60 * 60 * 24), // 1天前
                latestTotalTokens: 800
            }
        ];
        
        await injector.simulateExtensionMessage('updateSessions', { sessions });
        await injector.simulateExtensionMessage('updateCurrentSession', {
            session: sessions[0]
        });
        
        // 等待会话选择器组件出现
        await webviewPage.waitForSelector('.session-selector');
        
        // 为了在截图中展示下拉框内容，我们将 select 的 size 属性设置为大于 1
        await webviewPage.evaluate(() => {
            const select = document.querySelector('.session-dropdown') as HTMLSelectElement;
            if (select) {
                select.size = 4; // 展示 4 个选项
                select.style.height = 'auto';
            }
        });
        
        await webviewPage.screenshot({ path: 'screenshots/spec-sessions.png' });

        // 恢复 select 状态
        await webviewPage.evaluate(() => {
            const select = document.querySelector('.session-dropdown') as HTMLSelectElement;
            if (select) {
                select.size = 0;
            }
        });

        // 15. Plan 确认对话框 - 只显示确认对话框组件
        await injector.simulateExtensionMessage('showConfirmation', {
            confirmationId: 'plan-confirm-001',
            confirmationType: '计划执行确认',
            toolName: EXIT_PLAN_MODE_TOOL_NAME, // "ExitPlanMode"
            toolInput: {
                plan_content: `## 项目重构计划

### 第一步：代码分析
- 分析现有代码结构
- 识别重构重点模块
- 评估依赖关系

### 第二步：重构实施
- 重构核心组件
- 优化数据流
- 更新测试用例

### 第三步：验证测试
- 运行完整测试套件
- 性能基准测试
- 用户验收测试`
            }
        });
        const planConfirmDialog = webviewPage.locator('.confirmation-dialog');
        await planConfirmDialog.waitFor({ state: 'visible' });
        await planConfirmDialog.screenshot({ path: 'screenshots/spec-plan-confirm.png' });

        // 关闭当前确认对话框
        await webviewPage.click('.confirmation-close-btn');
        await planConfirmDialog.waitFor({ state: 'detached' });

        // 16. 代码修改确认对话框 - 只显示确认对话框组件
        await injector.simulateExtensionMessage('showConfirmation', {
            confirmationId: 'edit-confirm-001', 
            confirmationType: '代码修改确认',
            toolName: EDIT_TOOL_NAME, // "Edit"
            toolInput: {
                file_path: '/src/components/ChatInterface.tsx',
                old_string: 'const [messages, setMessages] = useState([]);',
                new_string: 'const [messages, setMessages] = useState<Message[]>([]);'
            }
        });
        const editConfirmDialog = webviewPage.locator('.confirmation-dialog');
        await editConfirmDialog.waitFor({ state: 'visible' });
        await editConfirmDialog.screenshot({ path: 'screenshots/spec-edit-confirm.png' });

        // 关闭当前确认对话框
        await webviewPage.click('.confirmation-close-btn');
        await editConfirmDialog.waitFor({ state: 'detached' });

        // 17. Bash运行确认对话框 - 只显示确认对话框组件
        await injector.simulateExtensionMessage('showConfirmation', {
            confirmationId: 'bash-confirm-001',
            confirmationType: 'Bash 命令执行确认', 
            toolName: BASH_TOOL_NAME, // "Bash"
            toolInput: {
                command: 'npm install --save-dev @types/react',
                description: '安装 React TypeScript 类型定义'
            }
        });
        const bashConfirmDialog = webviewPage.locator('.confirmation-dialog');
        await bashConfirmDialog.waitFor({ state: 'visible' });
        await bashConfirmDialog.screenshot({ path: 'screenshots/spec-bash-confirm.png' });

        // 18. Image Attachment
        await injector.simulateExtensionMessage('setInitialState', {
            messages: [],
            isStreaming: false,
            sessions: [],
            configurationData: {
                authMethod: 'apiKey',
                apiKey: 'sk-xxxxxxxxxxxxxxxx',
                baseURL: 'https://api.openai.com/v1',
                agentModel: 'gpt-4',
                fastModel: 'gpt-3.5-turbo'
            },
            permissionMode: 'default',
            inputContent: '请分析这张图片中的 UI 设计',
            attachedImages: [
                {
                    id: 'img-1',
                    data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
                    mimeType: 'image/png',
                    filename: 'ui-design.png'
                }
            ]
        });
        await webviewPage.waitForSelector('.attached-images');
        await webviewPage.locator('.input-container').screenshot({ path: 'screenshots/spec-image-attachment.png' });

        // 19. Exploration Tools
        const explorationMessages: Message[] = [
            {
                role: 'assistant',
                blocks: [
                    {
                        type: 'tool',
                        name: AGENT_TOOL_NAME,
                        stage: 'end',
                        compactParams: 'Explore: 查找所有 API 定义',
                        parameters: JSON.stringify({ subagent_type: 'Explore', description: '查找所有 API 定义', prompt: '...' }),
                        result: '子代理已完成探索',
                        shortResult: '子代理已完成探索'
                    },
                    {
                        type: 'tool',
                        name: GLOB_TOOL_NAME,
                        stage: 'end',
                        compactParams: 'src/**/*.ts in src',
                        parameters: JSON.stringify({ pattern: 'src/**/*.ts', path: 'src' }),
                        result: 'src/main.ts\nsrc/app.tsx\nsrc/utils.ts',
                        shortResult: 'Found 3 files'
                    },
                    {
                        type: 'tool',
                        name: GREP_TOOL_NAME,
                        stage: 'end',
                        compactParams: 'interface.*API ts in src',
                        parameters: JSON.stringify({ pattern: 'interface.*API', type: 'ts', path: 'src' }),
                        result: 'src/types.ts:10:export interface UserAPI {\nsrc/types.ts:20:export interface AuthAPI {',
                        shortResult: 'Found 2 matching lines'
                    },
                    {
                        type: 'tool',
                        name: READ_TOOL_NAME,
                        stage: 'end',
                        compactParams: 'src/main.ts 1:2000',
                        parameters: JSON.stringify({ file_path: 'src/main.ts' }),
                        result: 'import express from "express";\n...',
                        shortResult: 'Read 150 lines'
                    }
                ]
            }
        ];
        await injector.updateMessages(explorationMessages as any);
        await webviewPage.waitForSelector('.tool-container');
        await webviewPage.locator('.messages-container').screenshot({ path: 'screenshots/spec-exploration.png' });

        // 21. File Operation Tools
        const fileOpMessages: Message[] = [
            {
                role: 'assistant',
                blocks: [
                    {
                        type: 'tool',
                        name: WRITE_TOOL_NAME,
                        stage: 'end',
                        compactParams: 'src/new-file.ts 1 lines, 29 chars',
                        parameters: JSON.stringify({ file_path: 'src/new-file.ts', content: 'export const hello = "world";' }),
                        result: 'File created (1 lines, 29 characters)',
                        shortResult: 'File created'
                    },
                    {
                        type: 'tool',
                        name: EDIT_TOOL_NAME,
                        stage: 'end',
                        compactParams: 'src/app.tsx',
                        parameters: JSON.stringify({ file_path: 'src/app.tsx', old_string: 'A', new_string: 'B' }),
                        result: 'Text replaced successfully',
                        shortResult: 'Text replaced successfully'
                    }
                ]
            }
        ];
        await injector.updateMessages(fileOpMessages);
        await webviewPage.waitForSelector('.tool-container');
        await webviewPage.locator('.messages-container').screenshot({ path: 'screenshots/spec-file-ops.png' });

        // 22. Vision
        const visionMessages = [
            {
                role: 'user',
                blocks: [
                    { type: 'text', content: '这张图片里有什么？' },
                    { type: 'image', imageUrls: ['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='] }
                ]
            },
            MockDataGenerator.createAssistantMessage('这张图片显示了一个简单的 UI 布局，包含一个侧边栏和一个主内容区域。侧边栏使用了深色主题...')
        ];
        await injector.updateMessages(visionMessages as any);
        await webviewPage.locator('.messages-container').screenshot({ path: 'screenshots/spec-vision.png' });

        // 23. Mermaid Fullscreen
        const mermaidMsg = [
            MockDataGenerator.createAssistantMessage('```mermaid\ngraph LR\n  A[开始] --> B(处理)\n  B --> C{结果}\n  C -->|成功| D[结束]\n  C -->|失败| E[重试]\n```')
        ];
        await injector.updateMessages(mermaidMsg);
        await webviewPage.waitForSelector('.mermaid-container svg');
        await webviewPage.click('.mermaid-container'); // Click to open fullscreen
        await webviewPage.waitForSelector('.mermaid-fullscreen-modal');
        await webviewPage.screenshot({ path: 'screenshots/spec-mermaid-fullscreen.png' });
        await webviewPage.keyboard.press('Escape');

        // 24. LSP
        await injector.simulateExtensionMessage('setInitialState', {
            messages: [
                {
                    role: 'assistant',
                    blocks: [
                        {
                            type: 'tool',
                            name: 'LSP',
                            stage: 'end',
                            compactParams: 'goToDefinition (src/main.ts:10:5)',
                            parameters: JSON.stringify({ operation: 'goToDefinition', filePath: 'src/main.ts', line: 10, character: 5 }),
                            result: 'Found definition at src/utils.ts:25:10'
                        },
                        {
                            type: 'tool',
                            name: 'LSP',
                            stage: 'end',
                            compactParams: 'findReferences (src/utils.ts:25:10)',
                            parameters: JSON.stringify({ operation: 'findReferences', filePath: 'src/utils.ts', line: 25, character: 10 }),
                            result: 'Found 3 references:\n- src/main.ts:10:5\n- src/app.ts:42:12\n- tests/utils.test.ts:15:8'
                        },
                        {
                            type: 'tool',
                            name: 'LSP',
                            stage: 'end',
                            compactParams: 'hover (src/main.ts:10:5)',
                            parameters: JSON.stringify({ operation: 'hover', filePath: 'src/main.ts', line: 10, character: 5 }),
                            result: 'interface User {\n  id: string;\n  name: string;\n}\n\nRepresents a user in the system.'
                        },
                        {
                            type: 'tool',
                            name: 'LSP',
                            stage: 'end',
                            compactParams: 'incomingCalls (src/utils.ts:25:10)',
                            parameters: JSON.stringify({ operation: 'incomingCalls', filePath: 'src/utils.ts', line: 25, character: 10 }),
                            result: 'Callers of getUser:\n- AuthService.login (src/auth.ts:50)\n- AdminPanel.render (src/admin.tsx:120)'
                        }
                    ]
                }
            ]
        });
        await webviewPage.locator('.messages-container').screenshot({ path: 'screenshots/spec-lsp.png' });

        // 25. Skill
        await injector.simulateExtensionMessage('setInitialState', {
            messages: [
                {
                    role: 'assistant',
                    blocks: [
                        {
                            type: 'tool',
                            name: 'Skill',
                            stage: 'end',
                            compactParams: 'docx',
                            parameters: JSON.stringify({ skill_name: 'docx' }),
                            result: 'Document created successfully at ./report.docx',
                            shortResult: 'Invoked skill: docx'
                        }
                    ]
                }
            ]
        });
        await webviewPage.locator('.messages-container').screenshot({ path: 'screenshots/spec-skill.png' });

        // 26. MCP
        await injector.simulateExtensionMessage('setInitialState', {
            messages: [
                MockDataGenerator.createAssistantMessageWithTool(
                    '正在通过 MCP 查询外部数据...',
                    'mcp_search_tool',
                    JSON.stringify({ query: 'latest news' }),
                    'Found 3 results from external source.'
                )
            ]
        });
        await webviewPage.locator('.messages-container').screenshot({ path: 'screenshots/spec-mcp.png' });

        // 27. Reasoning
        await injector.simulateExtensionMessage('setInitialState', {
            messages: [
                {
                    role: 'assistant',
                    blocks: [
                        {
                            type: 'reasoning',
                            content: '我将按照以下步骤进行：\n\n1. **分析需求**：用户需要一个 React 教程\n2. **搜索资源**：查找相关文档和示例\n3. **生成内容**：整理并输出教程\n\n```typescript\n// 示例代码\nconst App = () => <div>Hello Wave</div>;\n```'
                        },
                        {
                            type: 'text',
                            content: '好的，这是一个关于 React 的基础教程...'
                        }
                    ]
                }
            ]
        });
        await webviewPage.locator('.messages-container').screenshot({ path: 'screenshots/spec-reasoning.png' });
    });
});
