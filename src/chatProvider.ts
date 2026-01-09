import * as vscode from 'vscode';
import type { SessionMetadata, ToolPermissionContext, PermissionDecision } from 'wave-agent-sdk';
import { ChatSession } from './session/chatSession';
import { ConfigurationService } from './services/configurationService';
import { FileService } from './services/fileService';
import { KnowledgeBaseService } from './services/kbService';
import { SessionService } from './services/sessionService';
import { SelectionService, SelectionInfo } from './services/selectionService';
import { WebviewManager } from './session/webviewManager';
import { MessageHandler } from './session/messageHandler';

export class ChatProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'waveChatView';
    private context: vscode.ExtensionContext;
    
    private sidebarSession: ChatSession;
    private tabSession: ChatSession;
    private windowSessions: Map<string, ChatSession> = new Map();

    private configService: ConfigurationService;
    private fileService: FileService;
    private kbService: KnowledgeBaseService;
    private sessionService: SessionService;
    private selectionService: SelectionService;
    private webviewManager: WebviewManager;
    private messageHandler: MessageHandler;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.configService = new ConfigurationService(context);
        this.fileService = new FileService();
        this.kbService = new KnowledgeBaseService();
        this.sessionService = new SessionService();
        this.selectionService = new SelectionService(context);

        this.webviewManager = new WebviewManager(context, {
            onMessage: async (message, viewType, windowId) => {
                await this.messageHandler.handleMessage(message, viewType, windowId);
            },
            onTabDispose: () => {
                console.log('标签页面板被关闭 - 销毁 agent 和清理资源');
                this.tabSession.destroy();
            },
            onWindowDispose: (windowId) => {
                console.log(`窗口面板被关闭 - 销毁 agent 和清理资源，窗口ID: ${windowId}`);
                const session = this.windowSessions.get(windowId);
                if (session) {
                    session.destroy().then(() => {
                        this.windowSessions.delete(windowId);
                    });
                }
            }
        });

        this.messageHandler = new MessageHandler(
            this.configService,
            this.fileService,
            this.kbService,
            this.sessionService,
            {
                getChatSession: (viewType, windowId) => this.getChatSession(viewType, windowId),
                postMessage: (message, viewType, windowId) => this.webviewManager.postMessage(message, viewType, windowId),
                initializeAgent: (viewType, windowId, restoreSessionId) => this.initializeAgent(viewType, windowId, restoreSessionId),
                listSessions: (viewType, windowId) => this.listSessions(viewType, windowId),
                updateAllSessionsConfig: (config) => {
                    this.sidebarSession.updateConfig(config);
                    this.tabSession.updateConfig(config);
                    this.windowSessions.forEach(session => session.updateConfig(config));
                },
                getSelection: () => this.selectionService.getSelection()
            }
        );

        this.sidebarSession = this.createChatSession('sidebar');
        this.tabSession = this.createChatSession('tab');

        console.log('创建了 ChatProvider');
        
        // Register as webview provider for sidebar
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider('waveChat', this)
        );
        
        // Listen for workspace folder changes
        const workspaceChangeListener = vscode.workspace.onDidChangeWorkspaceFolders((event) => {
            console.log('工作区文件夹已更改:', {
                added: event.added.map(f => f.uri.fsPath),
                removed: event.removed.map(f => f.uri.fsPath)
            });
        });
        
        this.context.subscriptions.push(workspaceChangeListener);

        // Listen for selection changes
        this.selectionService.onSelectionChange((selection) => {
            this.webviewManager.postMessage({
                command: 'updateSelection',
                selection
            });
        });
    }

    private createChatSession(viewType: 'sidebar' | 'tab' | 'window', windowId?: string): ChatSession {
        return new ChatSession(viewType, windowId, {
            onMessagesChange: (messages) => {
                this.webviewManager.postMessage({ command: 'updateMessages', messages }, viewType, windowId);
            },
            onSessionIdChange: (sessionId) => {
                this.handleSessionIdChange(sessionId, viewType, windowId).catch(err => 
                    console.error(`Error handling session ID change for ${viewType}:`, err)
                );
            },
            onSubagentMessagesChange: (subagentId, messages) => {
                const session = this.getChatSession(viewType, windowId);
                session.subagentMessages.set(subagentId, messages);
                this.webviewManager.postMessage({ command: 'updateSubagentMessages', subagentId, messages }, viewType, windowId);
            },
            onStreamingChange: (isStreaming) => {
                this.webviewManager.postMessage({ command: isStreaming ? 'startStreaming' : 'endStreaming' }, viewType, windowId);
            },
            onPermissionModeChange: (mode) => {
                this.webviewManager.postMessage({ command: 'updatePermissionMode', mode }, viewType, windowId);
            },
            onToolPermissionRequest: (context) => {
                return this.handleToolPermissionRequest(context, viewType, windowId);
            },
            onError: (error) => {
                this.sendErrorToView(error, viewType, windowId);
            }
        });
    }

    // Implement WebviewViewProvider interface for sidebar
    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        token: vscode.CancellationToken
    ): void | Thenable<void> {
        console.log('解析侧边栏webview视图');
        this.webviewManager.setSidebarView(webviewView);

        // Set sidebar visible context
        vscode.commands.executeCommand('setContext', 'waveChatSidebarVisible', true);
    }

    private async initializeAgent(viewType: 'sidebar' | 'tab' | 'window', windowId?: string, restoreSessionId?: string) {
        const session = this.getChatSession(viewType, windowId);
        if (session.isInitializing) {
            return;
        }

        try {
            const config = await this.configService.loadConfiguration();
            
            const isAuthValid = config.authMethod === 'apiKey' ? !!config.apiKey : !!config.headers;
            if (!isAuthValid || !config.baseURL || !config.agentModel || !config.fastModel) {
                console.log(`Skipping agent creation for ${viewType} due to missing configuration`);
                
                this.webviewManager.postMessage({
                    command: 'showConfiguration',
                    configurationData: config,
                    error: '请先在设置中配置鉴权信息, Base URL 和模型名称'
                }, viewType, windowId);
                
                return;
            }
            
            await session.initialize(config, this.context.extensionMode, restoreSessionId);
        } catch (error) {
            console.error(`初始化 ${viewType} 智能体失败:`, error);
            vscode.window.showErrorMessage(`初始化 ${viewType} AI 智能体失败: ` + error);
            this.sendErrorToView(error, viewType, windowId);
        }
    }

    private getChatSession(viewType: 'sidebar' | 'tab' | 'window', windowId?: string): ChatSession {
        if (viewType === 'sidebar') {
            return this.sidebarSession;
        } else if (viewType === 'tab') {
            return this.tabSession;
        } else if (viewType === 'window' && windowId) {
            if (!this.windowSessions.has(windowId)) {
                this.windowSessions.set(windowId, this.createChatSession('window', windowId));
            }
            return this.windowSessions.get(windowId)!;
        } else {
            throw new Error(`Invalid view type or missing windowId: ${viewType}, ${windowId}`);
        }
    }

    /**
     * Focus the appropriate chat view and send focus message to webview
     */
    public async focusView() {
        console.log('聚焦聊天视图...');

        // Check for active views in order of priority: window > tab > sidebar
        
        // 1. Check for active window panels first
        const windowPanels = this.webviewManager.getAllWindowPanels();
        if (windowPanels.size > 0) {
            const windowPanel = windowPanels.values().next().value;
            if (windowPanel) {
                console.log('聚焦窗口视图');
                windowPanel.reveal(vscode.ViewColumn.Active);
                windowPanel.webview.postMessage({ command: 'focusInput' });
                return;
            }
        }

        // 2. Check for tab panel
        const tabPanel = this.webviewManager.getTabPanel();
        if (tabPanel) {
            console.log('聚焦标签页视图');
            tabPanel.reveal(vscode.ViewColumn.Active);
            tabPanel.webview.postMessage({ command: 'focusInput' });
            return;
        }

        // 3. Check for sidebar
        const sidebarView = this.webviewManager.getSidebarView();
        if (sidebarView) {
            console.log('聚焦侧边栏视图');
            await vscode.commands.executeCommand('workbench.view.extension.waveChatView');
            setTimeout(() => {
                sidebarView.webview.postMessage({ command: 'focusInput' });
            }, 100);
            return;
        }

        // 4. No views are open, create a new tab view
        console.log('未找到活动视图，创建新的标签页视图');
        await this.createOrShowChatPanel('tab');
        setTimeout(() => {
            const panel = this.webviewManager.getTabPanel();
            if (panel) {
                panel.webview.postMessage({ command: 'focusInput' });
            }
        }, 100);
    }


    private sendErrorToView(error: any, viewType: 'sidebar' | 'tab' | 'window', windowId?: string) {
        const errorMessage = {
            command: 'sessionsError',
            error: `初始化${viewType}智能体失败: ` + error
        };
        this.webviewManager.postMessage(errorMessage, viewType, windowId);
    }

    public async createOrShowChatPanel(mode: 'sidebar' | 'tab' | 'window' = 'tab') {
        console.log(`调用了 createOrShowChatPanel，模式: ${mode}`);

        if (mode === 'sidebar') {
            if (!this.sidebarSession.agent) {
                await this.initializeAgent('sidebar');
            }
            await vscode.commands.executeCommand('workbench.view.extension.waveChatView');
            return;
        }

        if (mode === 'window') {
            const windowId = `window_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            this.webviewManager.createWindowPanel(ChatProvider.viewType + '_window', `Wave - 代码智聊`, windowId);
            await this.initializeAgent('window', windowId);
            await vscode.commands.executeCommand('workbench.action.moveEditorToNewWindow');
            return;
        }

        if (!this.tabSession.agent) {
            await this.initializeAgent('tab');
        }

        const columnToShowIn = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        const tabPanel = this.webviewManager.getTabPanel();
        if (tabPanel) {
            tabPanel.reveal(columnToShowIn);
        } else {
            this.webviewManager.createTabPanel(
                ChatProvider.viewType,
                'Wave - 代码智聊',
                columnToShowIn || vscode.ViewColumn.One
            );
        }
    }

    private async listSessions(viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        try {
            const sessionsWithContent = await this.sessionService.getSessionsList();
            this.webviewManager.postMessage({
                command: 'updateSessions',
                sessions: sessionsWithContent
            }, viewType, windowId);
        } catch (error) {
            console.error(`获取 ${viewType} 会话列表失败:`, error);

            const isDirectoryNotFound = error &&
                typeof error === 'object' &&
                'code' in error &&
                error.code === 'ENOENT';

            if (isDirectoryNotFound) {
                this.webviewManager.postMessage({
                    command: 'updateSessions',
                    sessions: []
                }, viewType, windowId);
            } else {
                this.webviewManager.postMessage({
                    command: 'sessionsError',
                    error: '获取会话列表失败: ' + error
                }, viewType, windowId);
            }
        }
    }

    private async handleToolPermissionRequest(context: ToolPermissionContext, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string): Promise<PermissionDecision> {
        const session = this.getChatSession(viewType || 'tab', windowId);
        
        return new Promise((resolve) => {
            const confirmationId = `confirmation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            let confirmationType: string;
            if (['Edit', 'MultiEdit', 'Write', 'Delete'].includes(context.toolName)) {
                confirmationType = '代码修改待确认';
            } else if (context.toolName === 'Bash') {
                confirmationType = '命令执行待确认';
            } else {
                confirmationType = '操作待确认';
            }

            session.pendingConfirmations.set(confirmationId, {
                resolve,
                toolName: context.toolName,
                confirmationType: confirmationType,
                toolInput: context.toolInput,
                suggestedPrefix: context.suggestedPrefix
            });

            this.webviewManager.postMessage({
                command: 'showConfirmation',
                confirmationId: confirmationId,
                toolName: context.toolName,
                confirmationType: confirmationType,
                toolInput: context.toolInput,
                suggestedPrefix: context.suggestedPrefix
            }, viewType, windowId);
        });
    }

    private async handleSessionIdChange(sessionId: string, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        const session = this.getChatSession(viewType || 'tab', windowId);
        if (session.agent) {
            this.webviewManager.postMessage({
                command: 'updateCurrentSession',
                session: {
                    id: sessionId,
                    sessionType: 'main',
                    workdir: session.agent.workingDirectory,
                    lastActiveAt: new Date(),
                    latestTotalTokens: session.agent.latestTotalTokens
                } as SessionMetadata
            }, viewType, windowId);
            await this.listSessions(viewType, windowId);
        }
    }

    /**
     * Clean up resources when extension deactivates
     */
    public async destroy() {
        console.log('ChatProvider 正在清理资源...');
        
        try {
            await this.sidebarSession.destroy();
            await this.tabSession.destroy();
            for (const session of this.windowSessions.values()) {
                await session.destroy();
            }
            this.windowSessions.clear();
        } catch (error) {
            console.error('销毁智能体时出错:', error);
        }
        
        this.webviewManager.dispose();
        
        console.log('ChatProvider 资源清理完成');
    }
}
