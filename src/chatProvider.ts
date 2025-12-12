import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { glob } from 'glob';
import { Agent, Message, listSessions, SessionMetadata, type PermissionDecision, type ToolPermissionContext, AgentCallbacks } from 'wave-agent-sdk';

interface ViewInstance {
    agent: Agent | undefined;
    messages: Message[];
    sessionId: string | undefined;
    pendingConfirmations: Map<string, { resolve: (decision: PermissionDecision) => void; toolName: string; }>;
}

export class ChatProvider implements vscode.WebviewViewProvider {
    private static readonly viewType = 'waveChatView';
    private panel: vscode.WebviewPanel | undefined;
    private webviewView: vscode.WebviewView | undefined;
    private windowPanels: Map<string, vscode.WebviewPanel> = new Map(); // Track window panels by windowId
    private context: vscode.ExtensionContext;
    private currentViewMode: 'sidebar' | 'tab' | 'window' | undefined;
    
    // Separate instances for each view type
    private sidebarInstance: ViewInstance = {
        agent: undefined,
        messages: [],
        sessionId: undefined,
        pendingConfirmations: new Map()
    };
    
    private tabInstance: ViewInstance = {
        agent: undefined,
        messages: [],
        sessionId: undefined,
        pendingConfirmations: new Map()
    };
    
    private windowInstances: Map<string, ViewInstance> = new Map(); // Each window has its own instance

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        console.log('创建了 ChatProvider');
        
        // Register as webview provider for sidebar
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider('waveChat', this)
        );
        
        // Listen for workspace folder changes (for logging/awareness only)
        // Note: Agent workdir remains unchanged for secondary folder changes due to single workdir limitation
        const workspaceChangeListener = vscode.workspace.onDidChangeWorkspaceFolders((event) => {
            console.log('工作区文件夹已更改:', {
                added: event.added.map(f => f.uri.fsPath),
                removed: event.removed.map(f => f.uri.fsPath)
            });
            
            if (event.added.length > 0 || event.removed.length > 0) {
                const currentFirst = vscode.workspace.workspaceFolders?.[0];
                console.log('当前第一个工作区文件夹:', currentFirst?.uri.fsPath || '无');
                console.log('注意：智能体工作目录保持不变（单一工作目录限制）');
            }
        });
        
        this.context.subscriptions.push(workspaceChangeListener);
    }

    // Implement WebviewViewProvider interface for sidebar
    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        token: vscode.CancellationToken
    ): void | Thenable<void> {
        console.log('解析侧边栏webview视图');
        this.webviewView = webviewView;
        this.currentViewMode = 'sidebar';

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };

        webviewView.webview.html = this.getWebviewContent(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(
            async (message) => {
                await this.handleWebviewMessage(message, 'sidebar');
            },
            undefined,
            this.context.subscriptions
        );

        // Note: We don't handle onDidDispose for sidebar because it should be persistent
        // The sidebar agent and its conversation should remain active even when the user
        // switches to other sidebar panels. Only destroy it when the extension deactivates.

        // Set sidebar visible context
        vscode.commands.executeCommand('setContext', 'waveChatSidebarVisible', true);

        // Initialize sidebar agent if not already done
        if (!this.sidebarInstance.agent) {
            this.initializeAgent('sidebar');
        }

        // Send initial state if we have data
        if (this.sidebarInstance.messages.length > 0) {
            this.updateChatMessages(this.sidebarInstance.messages, 'sidebar');
        }
    }

    private postMessageToWebview(message: any, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        // If specific viewType is provided, only send to that view
        if (viewType) {
            console.log(`发送消息到 ${viewType}${windowId ? ` (${windowId})` : ''}:`, message.command);
            if (viewType === 'sidebar' && this.webviewView) {
                this.webviewView.webview.postMessage(message);
            } else if (viewType === 'tab' && this.panel) {
                this.panel.webview.postMessage(message);
            } else if (viewType === 'window' && windowId) {
                const windowPanel = this.windowPanels.get(windowId);
                if (windowPanel) {
                    try {
                        windowPanel.webview.postMessage(message);
                    } catch (error) {
                        // Panel might be disposed, ignore error
                        console.error(`Error sending message to window ${windowId}:`, error);
                    }
                } else {
                    console.warn(`Window panel not found for windowId: ${windowId}`);
                    console.log('Available window panels:', Array.from(this.windowPanels.keys()));
                }
            }
            return;
        }

        // Default behavior: send to all active views
        console.log(`广播消息到所有视图:`, message.command);
        if (this.panel) {
            this.panel.webview.postMessage(message);
        }
        if (this.webviewView) {
            this.webviewView.webview.postMessage(message);
        }
        // Also send to all window panels
        this.windowPanels.forEach((panel, windowId) => {
            try {
                panel.webview.postMessage(message);
            } catch (error) {
                // Panel might be disposed, ignore error
                console.error(`Error sending message to window ${windowId}:`, error);
            }
        });
    }

    private async initializeAgent(viewType: 'sidebar' | 'tab' | 'window', windowId?: string, restoreSessionId?: string) {
        try {
            console.log(`正在初始化 ${viewType} 视图的智能体...`, windowId ? `窗口ID: ${windowId}` : '');
            
            // Detect current workspace folder for agent working directory
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            const workdir = workspaceFolder?.uri.fsPath;
            
            if (workdir) {
                console.log(`设置智能体工作目录为: ${workdir}`);
            } else {
                console.log('未检测到工作区文件夹，使用默认工作目录');
            }
            
            // Get the appropriate instance
            const instance = this.getViewInstance(viewType, windowId);
            
            // Only use onMessagesChange as it contains all data including errors
            const callbacks: AgentCallbacks = {
                onMessagesChange: (messages: Message[]) => {
                    console.log(`${viewType} 消息更新:`, messages.length, '条消息');
                    instance.messages = messages;
                    this.updateChatMessages(messages, viewType, windowId);
                },
                onSessionIdChange: (sessionId: string) => {
                    instance.sessionId = sessionId;
                    // Don't await here as callback is synchronous, but handle async work
                    this.handleSessionIdChange(sessionId, viewType, windowId).catch(error => {
                        console.error(`❌ 处理 ${viewType} 会话ID变更时出错:`, error);
                    });
                },
                onSubagentMessagesChange: (subagentId: string, messages: Message[]) => {
                    console.log(`${viewType} 子智能体消息更新 [${subagentId}]:`, messages.length, '条消息');
                    this.updateSubagentMessages(subagentId, messages, viewType, windowId);
                }
            };

            instance.agent = await Agent.create({
                callbacks,
                workdir,
                restoreSessionId,
                canUseTool: async (context: ToolPermissionContext): Promise<PermissionDecision> => {
                    return await this.handleToolPermissionRequest(context, viewType, windowId);
                }
            });
            
            console.log(`${viewType} 智能体初始化成功`);
            
        } catch (error) {
            console.error(`初始化 ${viewType} 智能体失败:`, error);
            vscode.window.showErrorMessage(`初始化 ${viewType} AI 智能体失败: ` + error);
            
            // Send error to specific view
            this.sendErrorToView(error, viewType, windowId);
        }
    }

    private getViewInstance(viewType: 'sidebar' | 'tab' | 'window', windowId?: string): ViewInstance {
        if (viewType === 'sidebar') {
            return this.sidebarInstance;
        } else if (viewType === 'tab') {
            return this.tabInstance;
        } else if (viewType === 'window' && windowId) {
            if (!this.windowInstances.has(windowId)) {
                this.windowInstances.set(windowId, {
                    agent: undefined,
                    messages: [],
                    sessionId: undefined,
                    pendingConfirmations: new Map()
                });
            }
            return this.windowInstances.get(windowId)!;
        } else {
            throw new Error(`Invalid view type or missing windowId: ${viewType}, ${windowId}`);
        }
    }

    /**
     * Clean up a view instance (agent and state)
     */
    private async cleanupViewInstance(instance: ViewInstance, viewName: string): Promise<void> {
        console.log(`清理 ${viewName} 实例资源...`);
        
        if (instance.agent) {
            console.log(`销毁 ${viewName} agent...`);
            try {
                await instance.agent.destroy();
                console.log(`${viewName} agent 销毁成功`);
            } catch (error) {
                console.error(`销毁 ${viewName} agent 时出错:`, error);
            }
            instance.agent = undefined;
        }
        
        // Clear instance state
        instance.messages = [];
        instance.sessionId = undefined;
        instance.pendingConfirmations.clear();
        
        console.log(`${viewName} 实例资源清理完成`);
    }

    private sendErrorToView(error: any, viewType: 'sidebar' | 'tab' | 'window', windowId?: string) {
        const errorMessage = {
            command: 'sessionsError',
            error: `初始化${viewType}智能体失败: ` + error
        };

        if (viewType === 'sidebar' && this.webviewView) {
            this.webviewView.webview.postMessage(errorMessage);
        } else if (viewType === 'tab' && this.panel) {
            this.panel.webview.postMessage(errorMessage);
        } else if (viewType === 'window' && windowId) {
            const windowPanel = this.windowPanels.get(windowId);
            if (windowPanel) {
                windowPanel.webview.postMessage(errorMessage);
            }
        }
    }

    public async createOrShowChatPanel(mode: 'sidebar' | 'tab' | 'window' = 'tab') {
        console.log(`调用了 createOrShowChatPanel，模式: ${mode}`);

        if (mode === 'sidebar') {
            // Initialize sidebar agent if needed
            if (!this.sidebarInstance.agent) {
                await this.initializeAgent('sidebar');
            }
            // For sidebar mode, show the sidebar view
            await vscode.commands.executeCommand('workbench.view.extension.waveChatView');
            return;
        }

        // For tab and window modes, use webview panels
        if (mode === 'window') {
            // Generate unique window ID
            const windowId = `window_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // For window mode, create new panel and then move to new window
            const newPanel = vscode.window.createWebviewPanel(
                ChatProvider.viewType + '_window',
                `CodeChat - 代码智聊`,
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    localResourceRoots: [this.context.extensionUri],
                    retainContextWhenHidden: true
                }
            );

            // Add to window panels map with windowId as key BEFORE setting up message handler
            this.windowPanels.set(windowId, newPanel);
            
            // Set up HTML content BEFORE message handler
            newPanel.webview.html = this.getWebviewContent(newPanel.webview);

            // Set up message handler
            newPanel.webview.onDidReceiveMessage(
                async (message) => {
                    await this.handleWebviewMessage(message, 'window', windowId);
                },
                undefined,
                this.context.subscriptions
            );

            newPanel.onDidDispose(
                () => {
                    console.log(`窗口面板被关闭 - 销毁 agent 和清理资源，窗口ID: ${windowId}`);
                    
                    // Remove from window panels map
                    this.windowPanels.delete(windowId);
                    
                    // Clean up window instance
                    const instance = this.windowInstances.get(windowId);
                    if (instance) {
                        this.cleanupViewInstance(instance, `窗口${windowId}`).then(() => {
                            this.windowInstances.delete(windowId);
                        });
                    } else {
                        console.log(`窗口 ${windowId} 实例未找到，可能已被清理`);
                    }
                },
                null,
                this.context.subscriptions
            );
            
            // Initialize window agent AFTER panel setup
            await this.initializeAgent('window', windowId);
            
            // Move the webview to a new window AFTER everything is set up
            await vscode.commands.executeCommand('workbench.action.moveEditorToNewWindow');
            
            return;
        }

        // For tab mode only
        if (!this.tabInstance.agent) {
            await this.initializeAgent('tab');
        }

        const columnToShowIn = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (this.panel) {
            // For tab mode, reveal existing panel
            this.panel.reveal(columnToShowIn);
        } else {
            // Create new panel for tab mode
            this.panel = vscode.window.createWebviewPanel(
                ChatProvider.viewType,
                'CodeChat - 代码智聊',
                {
                    viewColumn: columnToShowIn || vscode.ViewColumn.One,
                    preserveFocus: false
                },
                {
                    enableScripts: true,
                    localResourceRoots: [this.context.extensionUri],
                    retainContextWhenHidden: true
                }
            );

            this.currentViewMode = 'tab';
            this.panel.webview.html = this.getWebviewContent(this.panel.webview);

            this.panel.webview.onDidReceiveMessage(
                async (message) => {
                    await this.handleWebviewMessage(message, 'tab');
                },
                undefined,
                this.context.subscriptions
            );

            this.panel.onDidDispose(
                () => {
                    console.log('标签页面板被关闭 - 销毁 agent 和清理资源');
                    this.cleanupViewInstance(this.tabInstance, '标签页').then(() => {
                        this.panel = undefined;
                        this.currentViewMode = undefined;
                    });
                },
                null,
                this.context.subscriptions
            );

            // Send initial state to new panel
            if (this.tabInstance.messages.length > 0) {
                this.updateChatMessages(this.tabInstance.messages, 'tab');
            }
        }
    }

    private async handleWebviewMessage(message: any, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        const actualViewType = viewType || this.currentViewMode || 'tab';
        console.log(`处理来自 ${actualViewType} 视图的消息:`, message.command, windowId ? `窗口ID: ${windowId}` : '');
        
        switch (message.command) {
            case 'sendMessage':
                await this.sendMessageToAgent(message.text, message.images, actualViewType, windowId);
                break;
            case 'clearChat':
                await this.clearChat(actualViewType, windowId);
                break;
            case 'abortMessage':
                await this.abortMessage(actualViewType, windowId);
                break;
            case 'listSessions':
                await this.listSessions(actualViewType, windowId);
                break;
            case 'restoreSession':
                await this.restoreSession(message.sessionId, actualViewType, windowId);
                break;
            case 'requestFileSuggestions':
                await this.handleFileSuggestionsRequest(message.filterText, message.requestId, actualViewType, windowId);
                break;
            case 'requestSlashCommands':
                await this.handleSlashCommandsRequest(message.filterText, actualViewType, windowId);
                break;
            case 'confirmationResponse':
                await this.handleConfirmationResponse(message.confirmationId, message.approved, actualViewType, windowId);
                break;
            case 'getConfiguration':
                await this.handleGetConfiguration(actualViewType, windowId);
                break;
            case 'updateConfiguration':
                await this.handleUpdateConfiguration(message.configurationData, actualViewType, windowId);
                break;
            case 'uploadFilesToArtifacts':
                await this.handleUploadFilesToArtifacts(message.files, actualViewType, windowId);
                break;
            case 'showError':
                vscode.window.showErrorMessage(message.message);
                break;
            case 'webviewReady':
                await this.handleWebviewReady(actualViewType, windowId);
                break;
        }
    }

    private async sendMessageToAgent(text: string, images?: Array<{ data: string; mediaType: string; }>, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        const actualViewType = viewType || 'tab';
        const instance = this.getViewInstance(actualViewType, windowId);
        
        if (!instance.agent) {
            vscode.window.showErrorMessage('智能体未初始化');
            return;
        }

        try {
            console.log(`发送消息给 ${actualViewType} 智能体:`, text, windowId ? `窗口ID: ${windowId}` : '');
            if (images) {
                console.log('包含图片:', images.length, '张');
            }
            
            // Start streaming before sending message
            this.postMessageToWebview({
                command: 'startStreaming'
            }, actualViewType, windowId);
            
            // Convert base64 images to SDK format (assuming SDK accepts base64 in path field)
            let processedImages: Array<{ path: string; mimeType: string; }> | undefined;
            if (images && images.length > 0) {
                processedImages = images.map(image => ({
                    path: image.data, // Pass base64 data URL directly
                    mimeType: image.mediaType
                }));
            }
            
            await instance.agent.sendMessage(text, processedImages);
            console.log(`${actualViewType} 智能体 sendMessage 完成`);
            
            // End streaming after message is complete
            this.postMessageToWebview({
                command: 'endStreaming'
            }, actualViewType, windowId);
        } catch (error) {
            console.error(`发送消息给 ${actualViewType} 智能体时出错:`, error);
            
            // End streaming on error
            this.postMessageToWebview({
                command: 'endStreaming'
            }, actualViewType, windowId);
            
            vscode.window.showErrorMessage('发送消息失败: ' + error);
        }
    }

    private async abortMessage(viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        const actualViewType = viewType || 'tab';
        const instance = this.getViewInstance(actualViewType, windowId);
        
        if (!instance.agent) {
            console.log(`${actualViewType} 智能体未初始化，无法中止消息`);
            return;
        }

        try {
            console.log(`正在中止 ${actualViewType} 消息...`);
            instance.agent.abortMessage();
            console.log(`${actualViewType} 消息中止成功`);
        } catch (error) {
            console.error(`中止 ${actualViewType} 消息时出错:`, error);
            vscode.window.showErrorMessage('中止消息失败: ' + error);
        }
    }

    private async clearChat(viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        const actualViewType = viewType || 'tab';
        const instance = this.getViewInstance(actualViewType, windowId);
        
        if (!instance.agent) {
            console.log(`${actualViewType} 智能体未初始化，无法清除聊天`);
            return;
        }

        try {
            console.log(`正在清除 ${actualViewType} 聊天会话...`);
            await instance.agent.sendMessage('/clear');
            console.log(`${actualViewType} 聊天会话清除成功`);
        } catch (error) {
            console.error(`清除 ${actualViewType} 聊天会话失败:`, error);
            vscode.window.showErrorMessage('清除聊天失败: ' + error);
        }
    }

    private async listSessions(viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        const actualViewType = viewType || 'tab';
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            const workdir = workspaceFolder?.uri.fsPath || process.cwd();

            console.log(`获取 ${actualViewType} 会话列表，工作目录:`, workdir);
            const sessions = await listSessions(workdir);

            this.postMessageToWebview({
                command: 'updateSessions',
                sessions: sessions
            }, actualViewType, windowId);
        } catch (error) {
            console.error(`获取 ${actualViewType} 会话列表失败:`, error);

            // Check if this is a directory not found error (ENOENT)
            const isDirectoryNotFound = error &&
                typeof error === 'object' &&
                'code' in error &&
                error.code === 'ENOENT';

            if (isDirectoryNotFound) {
                // For missing Wave directory, silently handle by sending empty sessions list
                console.log('Wave sessions directory does not exist yet, showing empty sessions list');
                this.postMessageToWebview({
                    command: 'updateSessions',
                    sessions: []
                }, actualViewType, windowId);
            } else {
                // For other errors, show the error to the user
                this.postMessageToWebview({
                    command: 'sessionsError',
                    error: '获取会话列表失败: ' + error
                }, actualViewType, windowId);
            }
        }
    }

    private async restoreSession(sessionId: string, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        const actualViewType = viewType || 'tab';
        if (!sessionId) {
            return;
        }

        const instance = this.getViewInstance(actualViewType, windowId);
        if (!instance.agent) {
            console.log(`智能体未初始化，无法恢复 ${actualViewType} 会话`);
            return;
        }

        try {
            console.log(`恢复 ${actualViewType} 会话:`, sessionId);

            // Use agent's restoreSession method instead of destroying and recreating
            await instance.agent.restoreSession(sessionId);
            console.log(`${actualViewType} 会话恢复成功`);

        } catch (error) {
            console.error(`恢复 ${actualViewType} 会话失败:`, error);
            vscode.window.showErrorMessage('恢复会话失败: ' + error);

            this.postMessageToWebview({
                command: 'sessionsError',
                error: '恢复会话失败: ' + error
            }, actualViewType, windowId);
        }
    }

    private async handleFileSuggestionsRequest(filterText: string, requestId: string, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        const actualViewType = viewType || 'tab';
        try {
            console.log(`处理 ${actualViewType} 文件建议请求:`, filterText, requestId);

            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                this.postMessageToWebview({
                    command: 'fileSuggestionsResponse',
                    suggestions: [],
                    filterText: filterText,
                    requestId: requestId
                }, actualViewType, windowId);
                return;
            }

            // Find files in workspace with intelligent filtering
            const files = await this.findWorkspaceFiles(filterText);

            this.postMessageToWebview({
                command: 'fileSuggestionsResponse',
                suggestions: files,
                filterText: filterText,
                requestId: requestId
            }, actualViewType, windowId);

        } catch (error) {
            console.error(`获取 ${actualViewType} 文件建议失败:`, error);
            this.postMessageToWebview({
                command: 'fileSuggestionsError',
                error: '获取文件建议失败: ' + error,
                requestId: requestId
            }, actualViewType, windowId);
        }
    }

    private async handleUploadFilesToArtifacts(files: any[], viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        const actualViewType = viewType || 'tab';
        try {
            console.log(`处理 ${actualViewType} 文件上传请求:`, files.length, '个文件', windowId ? `窗口ID: ${windowId}` : '');

            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                this.postMessageToWebview({
                    command: 'uploadError',
                    error: '没有打开的工作区'
                }, actualViewType, windowId);
                return;
            }

            // Create .wave/artifacts directory if it doesn't exist
            const artifactsDir = path.join(workspaceFolder.uri.fsPath, '.wave', 'artifacts');
            if (!fs.existsSync(artifactsDir)) {
                fs.mkdirSync(artifactsDir, { recursive: true });
            }

            const uploadedFiles: string[] = [];
            const errors: string[] = [];

            for (const file of files) {
                try {
                    const fileName = file.name;
                    const filePath = path.join(artifactsDir, fileName);
                    
                    // Handle potential file name conflicts
                    let finalPath = filePath;
                    let counter = 1;
                    while (fs.existsSync(finalPath)) {
                        const ext = path.extname(fileName);
                        const baseName = path.basename(fileName, ext);
                        finalPath = path.join(artifactsDir, `${baseName}_${counter}${ext}`);
                        counter++;
                    }

                    // Convert ArrayBuffer to Buffer for writing
                    const buffer = Buffer.from(file.data);
                    fs.writeFileSync(finalPath, buffer);
                    
                    const relativePath = path.relative(workspaceFolder.uri.fsPath, finalPath);
                    uploadedFiles.push(relativePath);
                    
                    console.log(`成功上传文件: ${relativePath}`);
                } catch (error) {
                    console.error(`上传文件 ${file.name} 失败:`, error);
                    errors.push(`${file.name}: ${error}`);
                }
            }

            // Send response back to webview
            if (uploadedFiles.length > 0) {
                this.postMessageToWebview({
                    command: 'uploadSuccess',
                    uploadedFiles: uploadedFiles,
                    message: `成功上传 ${uploadedFiles.length} 个文件到 .wave/artifacts`
                }, actualViewType, windowId);

                // Show success notification
                vscode.window.showInformationMessage(
                    `成功上传 ${uploadedFiles.length} 个文件到 .wave/artifacts`
                );
            }

            if (errors.length > 0) {
                this.postMessageToWebview({
                    command: 'uploadError',
                    errors: errors,
                    message: `部分文件上传失败: ${errors.length} 个错误`
                }, actualViewType, windowId);

                // Show error notification
                vscode.window.showErrorMessage(
                    `部分文件上传失败: ${errors.length} 个错误`
                );
            }

        } catch (error) {
            console.error(`文件上传处理失败:`, error);
            this.postMessageToWebview({
                command: 'uploadError',
                error: '文件上传处理失败: ' + error,
            }, actualViewType, windowId);
        }
    }

    private async findWorkspaceFiles(filterText: string): Promise<any[]> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return [];
        }

        try {
            const allItems: any[] = [];
            const workspacePath = workspaceFolder.uri.fsPath;

            // 1. Get files using glob package with case insensitive matching
            let filePattern = '**/*'; // Default pattern
            if (filterText && filterText.trim()) {
                // Use filterText as glob pattern for file searching
                // If filterText doesn't contain wildcards, wrap it with wildcards
                if (!filterText.includes('*') && !filterText.includes('?')) {
                    filePattern = `**/*${filterText}*`;
                } else {
                    filePattern = filterText;
                }
            }

            // Use glob to find files with case insensitive matching

            const filePaths = await glob(filePattern, {
                cwd: workspacePath,
                nodir: true, // Only return files, not directories
                nocase: true, // Case insensitive matching
                ignore: [
                    'node_modules/**',
                    '.git/**',
                    'dist/**',
                    'build/**',
                    '.vscode/**'
                ],
                maxDepth: 5 // Reasonable depth limit
            });


            // Convert files to FileItem format
            const fileItems = filePaths.slice(0, 15).map(relativePath => {
                const fullPath = path.join(workspacePath, relativePath);
                const pathSegments = relativePath.split(path.sep);
                const name = pathSegments[pathSegments.length - 1];
                const extensionMatch = name.match(/\.([^.]+)$/);
                const extension = extensionMatch ? extensionMatch[1] : '';

                return {
                    path: fullPath,
                    relativePath: relativePath,
                    name: name,
                    extension: extension,
                    icon: 'codicon-file',
                    isDirectory: false
                };
            });

            // 2. Get directories using glob package
            const directories = await this.findWorkspaceDirectories(workspaceFolder, filterText);

            // Combine files and directories
            allItems.push(...fileItems, ...directories);

            // 3. Sort by relevance
            allItems.sort((a, b) => {
                const aNameMatch = a.name.toLowerCase().startsWith((filterText || '').toLowerCase());
                const bNameMatch = b.name.toLowerCase().startsWith((filterText || '').toLowerCase());

                if (aNameMatch && !bNameMatch) return -1;
                if (!aNameMatch && bNameMatch) return 1;

                // Prefer directories over files (optional)
                if (a.isDirectory && !b.isDirectory) return -1;
                if (!a.isDirectory && b.isDirectory) return 1;

                return a.name.localeCompare(b.name);
            });

            return allItems.slice(0, 20); // Limit total results to 20 for better UX
        } catch (error) {
            console.error('搜索工作区文件失败:', error);
            return [];
        }
    }

    // Find directories using glob package
    private async findWorkspaceDirectories(workspaceFolder: vscode.WorkspaceFolder, filterText: string): Promise<any[]> {
        try {
            const workspacePath = workspaceFolder.uri.fsPath;
            
            // Create glob pattern for directories
            let dirPattern = '**/*/'; // Default pattern for directories
            if (filterText && filterText.trim()) {
                // Create pattern that matches directories containing filterText
                if (!filterText.includes('*') && !filterText.includes('?')) {
                    dirPattern = `**/*${filterText}*/`;
                } else {
                    dirPattern = filterText.endsWith('/') ? filterText : `${filterText}/`;
                }
            }

            // Use glob to find directories with case insensitive matching
            const dirPaths = await glob(dirPattern, {
                cwd: workspacePath,
                nodir: false, // Allow directories to be returned (default behavior)
                nocase: true, // Case insensitive matching
                ignore: [
                    'node_modules/**',
                    '.git/**',
                    'dist/**',
                    'build/**',
                    '.vscode/**'
                ],
                maxDepth: 5 // Limit depth to avoid scanning too deep
            });
            
            // Convert to FileItem format
            return dirPaths.map(relativePath => {
                const fullPath = path.join(workspacePath, relativePath);
                const pathSegments = relativePath.split(path.sep);
                const name = pathSegments[pathSegments.length - 1] || pathSegments[pathSegments.length - 2]; // Handle trailing slash
                
                return {
                    path: fullPath,
                    relativePath: relativePath.replace(/\/$/, ''), // Remove trailing slash
                    name: name,
                    extension: '',
                    icon: 'codicon-folder',
                    isDirectory: true
                };
            });
        } catch (error) {
            console.error('使用 glob 搜索目录失败:', error);
            return [];
        }
    }



    private getFileIcon(extension: string): string {
        // Simplified: only return 'codicon-file'
        // Directory icons are handled in the findWorkspaceFiles method
        return 'codicon-file';
    }

    private updateChatMessages(messages: Message[], viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        console.log(`更新 ${viewType || '所有'} 聊天消息:`, messages.length, windowId ? `窗口ID: ${windowId}` : '');
        this.postMessageToWebview({
            command: 'updateMessages',
            messages: messages // Pass Message objects directly
        }, viewType, windowId);
    }

    private updateSubagentMessages(subagentId: string, messages: Message[], viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        console.log(`更新 ${viewType || '所有'} 子智能体 [${subagentId}] 消息:`, messages.length, windowId ? `窗口ID: ${windowId}` : '');
        this.postMessageToWebview({
            command: 'updateSubagentMessages',
            subagentId: subagentId,
            messages: messages
        }, viewType, windowId);
    }

    private async handleToolPermissionRequest(context: ToolPermissionContext, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string): Promise<PermissionDecision> {
        const actualViewType = viewType || 'tab';
        const instance = this.getViewInstance(actualViewType, windowId);
        
        console.log(`${actualViewType} handleToolPermissionRequest 被调用:`, context.toolName, windowId ? `窗口ID: ${windowId}` : '');
        return new Promise((resolve) => {
            const confirmationId = `confirmation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Store the resolve function to call later
            instance.pendingConfirmations.set(confirmationId, {
                resolve,
                toolName: context.toolName
            });

            // Determine confirmation message based on tool type
            let confirmationType: string;
            if (['Edit', 'MultiEdit', 'Write', 'Delete'].includes(context.toolName)) {
                confirmationType = '代码修改待确认';
            } else if (context.toolName === 'Bash') {
                confirmationType = '命令执行待确认';
            } else {
                confirmationType = '操作待确认';
            }

            // Send confirmation request to webview
            this.postMessageToWebview({
                command: 'showConfirmation',
                confirmationId: confirmationId,
                toolName: context.toolName,
                confirmationType: confirmationType,
                toolInput: context.toolInput
            }, actualViewType, windowId);
        });
    }

    private async handleConfirmationResponse(confirmationId: string, approved: boolean, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        const actualViewType = viewType || 'tab';
        const instance = this.getViewInstance(actualViewType, windowId);
        
        const pending = instance.pendingConfirmations.get(confirmationId);
        if (!pending) {
            console.warn(`收到 ${actualViewType} 未知确认响应:`, confirmationId);
            return;
        }

        instance.pendingConfirmations.delete(confirmationId);

        if (approved) {
            pending.resolve({ behavior: 'allow' });
        } else {
            pending.resolve({
                behavior: 'deny',
                message: '用户拒绝了操作'
            });

            // When user rejects, abort the current message
            const instance = this.getViewInstance(actualViewType, windowId);
            if (instance.agent) {
                try {
                    instance.agent.abortMessage();
                    console.log(`用户拒绝 ${actualViewType} 操作，已中止消息`);
                } catch (error) {
                    console.error(`中止 ${actualViewType} 消息时出错:`, error);
                }
            }
        }
    }

    private async handleSessionIdChange(sessionId: string, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        const actualViewType = viewType || 'tab';
        console.log(`🔄 处理 ${actualViewType} 会话ID变更:`, sessionId, windowId ? `窗口ID: ${windowId}` : '');
        
        const instance = this.getViewInstance(actualViewType, windowId);
        if (instance.agent) {
            console.log(`📤 发送 ${actualViewType} updateCurrentSession消息，新session ID:`, sessionId);
            // Update current session info
            this.postMessageToWebview({
                command: 'updateCurrentSession',
                session: {
                    id: sessionId,
                    sessionType: 'main',
                    workdir: instance.agent.workingDirectory,
                    lastActiveAt: new Date(),
                    latestTotalTokens: instance.agent.latestTotalTokens
                } as SessionMetadata
            }, actualViewType, windowId);
            
            console.log(`🔄 刷新 ${actualViewType} 会话列表...`);
            // Also trigger sessions list update for this view
            await this.listSessions(actualViewType, windowId);
        }
    }

    // Configuration management methods

    /**
     * Get the ~/.wave/settings.json file path
     */
    private getWaveSettingsPath(): string {
        return path.join(os.homedir(), '.wave', 'settings.json');
    }

    /**
     * Ensure ~/.wave directory exists
     */
    private async ensureWaveDirectory(): Promise<void> {
        const waveDir = path.join(os.homedir(), '.wave');
        try {
            await fs.promises.access(waveDir);
        } catch (error) {
            // Directory doesn't exist, create it
            await fs.promises.mkdir(waveDir, { recursive: true });
            console.log('Created ~/.wave directory');
        }
    }

    /**
     * Load configuration from ~/.wave/settings.json
     */
    private async loadConfiguration(): Promise<any> {
        try {
            const settingsPath = this.getWaveSettingsPath();
            await fs.promises.access(settingsPath);
            const content = await fs.promises.readFile(settingsPath, 'utf8');
            const settings = JSON.parse(content);

            // Extract configuration from env field
            const env = settings.env || {};
            return {
                apiKey: env.AIGW_TOKEN || '',
                baseURL: env.AIGW_URL || '',
                agentModel: env.AIGW_MODEL || '',
                fastModel: env.AIGW_FAST_MODEL || ''
            };
        } catch (error) {
            // File doesn't exist or is invalid, return default config
            console.log('No configuration file found, using defaults');
            return {
                apiKey: '',
                baseURL: '',
                agentModel: '',
                fastModel: ''
            };
        }
    }

    /**
     * Save configuration to ~/.wave/settings.json
     */
    private async saveConfiguration(configData: any): Promise<void> {
        try {
            await this.ensureWaveDirectory();
            const settingsPath = this.getWaveSettingsPath();

            // Load existing settings or create new ones
            let settings: any = {};
            try {
                const content = await fs.promises.readFile(settingsPath, 'utf8');
                settings = JSON.parse(content);
            } catch (error) {
                // File doesn't exist or is invalid, start with empty settings
                settings = {};
            }

            // Ensure env field exists
            if (!settings.env) {
                settings.env = {};
            }

            // Map configuration fields to environment variables
            if (configData.apiKey !== undefined) {
                settings.env.AIGW_TOKEN = configData.apiKey;
            }
            if (configData.baseURL !== undefined) {
                settings.env.AIGW_URL = configData.baseURL;
            }
            if (configData.agentModel !== undefined) {
                settings.env.AIGW_MODEL = configData.agentModel;
            }
            if (configData.fastModel !== undefined) {
                settings.env.AIGW_FAST_MODEL = configData.fastModel;
            }

            // Write settings back to file
            const content = JSON.stringify(settings, null, 2);
            await fs.promises.writeFile(settingsPath, content, 'utf8');
            console.log('Configuration saved to ~/.wave/settings.json');
        } catch (error) {
            console.error('Failed to save configuration:', error);
            throw error;
        }
    }

    /**
     * Handle getConfiguration message from webview
     */
    private async handleGetConfiguration(viewType?: 'sidebar' | 'tab' | 'window', windowId?: string): Promise<void> {
        const actualViewType = viewType || 'tab';
        try {
            const config = await this.loadConfiguration();
            this.postMessageToWebview({
                command: 'configurationResponse',
                configurationData: config
            }, actualViewType, windowId);
        } catch (error) {
            console.error(`Failed to get ${actualViewType} configuration:`, error);
            this.postMessageToWebview({
                command: 'configurationError',
                error: 'Failed to load configuration: ' + error
            }, actualViewType, windowId);
        }
    }

    /**
     * Handle updateConfiguration message from webview
     */
    private async handleUpdateConfiguration(configData: any, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string): Promise<void> {
        const actualViewType = viewType || 'tab';
        try {
            await this.saveConfiguration(configData);
            this.postMessageToWebview({
                command: 'configurationUpdated'
            }, actualViewType, windowId);
        } catch (error) {
            console.error(`Failed to update ${actualViewType} configuration:`, error);
            this.postMessageToWebview({
                command: 'configurationError',
                error: 'Failed to save configuration: ' + error
            }, actualViewType, windowId);
        }
    }

    private async handleWebviewReady(viewType?: 'sidebar' | 'tab' | 'window', windowId?: string): Promise<void> {
        const actualViewType = viewType || 'tab';
        console.log(`${actualViewType} Webview ready, sending initial state...`, windowId ? `窗口ID: ${windowId}` : '');
        
        const instance = this.getViewInstance(actualViewType, windowId);
        console.log(`${actualViewType} 实例状态:`, {
            hasAgent: !!instance.agent,
            messagesCount: instance.messages.length,
            sessionId: instance.sessionId
        });
        
        // Initialize agent if not yet initialized (fallback for race conditions)
        if (!instance.agent) {
            console.log(`${actualViewType} agent 未初始化，正在初始化...`);
            await this.initializeAgent(actualViewType, windowId);
        }
        
        // Send current messages if we have them
        if (instance.messages.length > 0) {
            console.log(`发送 ${instance.messages.length} 条历史消息到 ${actualViewType}`);
            this.updateChatMessages(instance.messages, actualViewType, windowId);
        }
        
        // Send current session info if available
        if (instance.sessionId && instance.agent) {
            console.log(`发送会话信息到 ${actualViewType}:`, instance.sessionId);
            this.postMessageToWebview({
                command: 'updateCurrentSession',
                session: {
                    id: instance.sessionId,
                    sessionType: 'main',
                    workdir: instance.agent.workingDirectory,
                    lastActiveAt: new Date(),
                    latestTotalTokens: instance.agent.latestTotalTokens
                } as SessionMetadata
            }, actualViewType, windowId);
        }
        
        // Also trigger sessions list update
        console.log(`触发 ${actualViewType} 会话列表更新...`);
        await this.listSessions(actualViewType, windowId);
    }

    /**
     * Handle requestSlashCommands message from webview
     */
    private async handleSlashCommandsRequest(filterText: string, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        const actualViewType = viewType || 'tab';
        const instance = this.getViewInstance(actualViewType, windowId);
        
        try {
            console.log(`处理 ${actualViewType} 指令请求:`, filterText);

            if (!instance.agent) {
                this.postMessageToWebview({
                    command: 'slashCommandsError',
                    error: '智能体未初始化'
                }, actualViewType, windowId);
                return;
            }

            // Get slash commands from the agent
            const allCommands = instance.agent.getSlashCommands();

            // Filter commands based on filter text (only by id and name, not description)
            let filteredCommands = allCommands;
            if (filterText && filterText.trim().length > 0) {
                const filter = filterText.toLowerCase();
                filteredCommands = allCommands.filter(command =>
                    command.id.toLowerCase().includes(filter) ||
                    command.name.toLowerCase().includes(filter)
                );
            }

            // Convert to the format expected by the frontend
            const commands = filteredCommands.map(command => ({
                id: command.id,
                name: command.name,
                description: command.description
            }));

            this.postMessageToWebview({
                command: 'slashCommandsResponse',
                commands: commands
            }, actualViewType, windowId);

        } catch (error) {
            console.error(`获取 ${actualViewType} 指令失败:`, error);
            this.postMessageToWebview({
                command: 'slashCommandsError',
                error: '获取指令失败: ' + error
            }, actualViewType, windowId);
        }
    }



    private getWebviewContent(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'webview', 'dist', 'chat.js')
        );

        // Add codicon CSS URI
        const codiconUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', '@vscode', 'codicons', 'dist', 'codicon.css')
        );

        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource}; font-src ${webview.cspSource};">
    <title>Wave AI Chat</title>
    <link rel="stylesheet" href="${codiconUri}">
</head>
<body>
    <div id="root"></div>
    <script src="${scriptUri}"></script>
</body>
</html>`;
    }

    /**
     * Clean up resources when extension deactivates
     */
    public async destroy() {
        console.log('ChatProvider 正在清理资源...');
        
        // Destroy all agent instances
        try {
            // Clean up sidebar instance (only on extension deactivation)
            await this.cleanupViewInstance(this.sidebarInstance, '侧边栏');
            
            // Clean up tab instance (also only on extension deactivation, 
            // as tab disposal is handled separately)
            await this.cleanupViewInstance(this.tabInstance, '标签页');
            
            // Clean up all window instances (also only on extension deactivation,
            // as window disposal is handled separately)
            for (const [windowId, instance] of this.windowInstances.entries()) {
                await this.cleanupViewInstance(instance, `窗口${windowId}`);
            }
            this.windowInstances.clear();
            
        } catch (error) {
            console.error('销毁智能体时出错:', error);
        }
        
        // Close all webview panels
        if (this.panel) {
            this.panel.dispose();
            this.panel = undefined;
        }

        // Close all window panels
        this.windowPanels.forEach((panel, windowId) => {
            try {
                panel.dispose();
            } catch (error) {
                // Panel might already be disposed
                console.error(`Error disposing window panel ${windowId}:`, error);
            }
        });
        this.windowPanels.clear();

        // Clear webview view reference
        if (this.webviewView) {
            this.webviewView = undefined;
        }
        
        console.log('ChatProvider 资源清理完成');
    }
}