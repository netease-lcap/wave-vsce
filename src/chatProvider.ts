import * as vscode from 'vscode';
import { Agent, Message, listSessions, SessionMetadata, type PermissionDecision, type ToolPermissionContext } from 'wave-agent-sdk';
import type { MessageManagerCallbacks } from 'wave-agent-sdk/dist/managers/messageManager';

export class ChatProvider {
    private static readonly viewType = 'waveChatView';
    private panel: vscode.WebviewPanel | undefined;
    private agent: Agent | undefined;
    private context: vscode.ExtensionContext;
    private pendingConfirmations: Map<string, { resolve: (decision: PermissionDecision) => void; toolName: string; }> = new Map();

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        console.log('创建了 ChatProvider');
        
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

    private async initializeAgent(restoreSessionId?: string) {
        try {
            console.log('正在初始化智能体，使用简化的流式处理...');
            
            // Detect current workspace folder for agent working directory
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            const workdir = workspaceFolder?.uri.fsPath;
            
            if (workdir) {
                console.log(`设置智能体工作目录为: ${workdir}`);
            } else {
                console.log('未检测到工作区文件夹，使用默认工作目录');
            }
            
            // Only use onMessagesChange as it contains all data including errors
            const callbacks: MessageManagerCallbacks = {
                onMessagesChange: (messages: Message[]) => {
                    console.log('消息更新:', messages.length, '条消息');
                    this.updateChatMessages(messages);
                },
                onSessionIdChange: (sessionId: string) => {
                    // Don't await here as callback is synchronous, but handle async work
                    this.handleSessionIdChange(sessionId).catch(error => {
                        console.error('❌ 处理会话ID变更时出错:', error);
                    });
                }
            };

            this.agent = await Agent.create({
                callbacks,
                workdir,
                restoreSessionId,
                permissionMode: 'default',
                canUseTool: async (context: ToolPermissionContext): Promise<PermissionDecision> => {
                    return await this.handleToolPermissionRequest(context);
                }
            });
            
            console.log('智能体初始化成功');
            
        } catch (error) {
            console.error('初始化智能体失败:', error);
            vscode.window.showErrorMessage('初始化 AI 智能体失败: ' + error);
            
            // Send error to webview
            if (this.panel) {
                this.panel.webview.postMessage({
                    command: 'sessionsError',
                    error: '初始化智能体失败: ' + error
                });
            }
        }
    }

    public async createOrShowChatPanel() {
        console.log('调用了 createOrShowChatPanel');
        
        if (!this.agent) {
            await this.initializeAgent();
        }

        const columnToShowIn = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (this.panel) {
            this.panel.reveal(columnToShowIn);
        } else {
            this.panel = vscode.window.createWebviewPanel(
                ChatProvider.viewType,
                'Wave AI 聊天',
                columnToShowIn || vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    localResourceRoots: [this.context.extensionUri],
                    retainContextWhenHidden: true
                }
            );

            this.panel.webview.html = this.getWebviewContent();

            this.panel.webview.onDidReceiveMessage(
                async (message) => {
                    await this.handleWebviewMessage(message);
                },
                undefined,
                this.context.subscriptions
            );

            this.panel.onDidDispose(
                () => {
                    this.panel = undefined;
                },
                null,
                this.context.subscriptions
            );
        }
    }

    private async handleWebviewMessage(message: any) {
        switch (message.command) {
            case 'sendMessage':
                await this.sendMessageToAgent(message.text);
                break;
            case 'clearChat':
                await this.clearChat();
                break;
            case 'abortMessage':
                await this.abortMessage();
                break;
            case 'listSessions':
                await this.listSessions();
                break;
            case 'restoreSession':
                await this.restoreSession(message.sessionId);
                break;
            case 'requestFileSuggestions':
                await this.handleFileSuggestionsRequest(message.filterText, message.requestId);
                break;
            case 'confirmationResponse':
                await this.handleConfirmationResponse(message.confirmationId, message.approved);
                break;
        }
    }

    private async sendMessageToAgent(text: string) {
        if (!this.agent) {
            vscode.window.showErrorMessage('智能体未初始化');
            return;
        }

        try {
            console.log('发送消息给智能体:', text);
            
            // Start streaming before sending message
            if (this.panel) {
                this.panel.webview.postMessage({
                    command: 'startStreaming'
                });
            }
            
            await this.agent.sendMessage(text);
            console.log('智能体 sendMessage 完成');
            
            // End streaming after message is complete
            if (this.panel) {
                this.panel.webview.postMessage({
                    command: 'endStreaming'
                });
            }
        } catch (error) {
            console.error('发送消息给智能体时出错:', error);
            
            // End streaming on error
            if (this.panel) {
                this.panel.webview.postMessage({
                    command: 'endStreaming'
                });
            }
            
            vscode.window.showErrorMessage('发送消息失败: ' + error);
        }
    }

    private async abortMessage() {
        if (!this.agent) {
            console.log('智能体未初始化，无法中止消息');
            return;
        }

        try {
            console.log('正在中止消息...');
            this.agent.abortMessage();
            console.log('消息中止成功');
        } catch (error) {
            console.error('中止消息时出错:', error);
            vscode.window.showErrorMessage('中止消息失败: ' + error);
        }
    }

    private async clearChat() {
        if (!this.agent) {
            console.log('智能体未初始化，无法清除聊天');
            return;
        }

        try {
            console.log('正在清除聊天会话...');
            await this.agent.sendMessage('/clear');
            console.log('聊天会话清除成功');
        } catch (error) {
            console.error('清除聊天会话失败:', error);
            vscode.window.showErrorMessage('清除聊天失败: ' + error);
        }
    }

    private async listSessions() {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            const workdir = workspaceFolder?.uri.fsPath || process.cwd();

            console.log('获取会话列表，工作目录:', workdir);
            const sessions = await listSessions(workdir);

            if (this.panel) {
                this.panel.webview.postMessage({
                    command: 'updateSessions',
                    sessions: sessions
                });
            }
        } catch (error) {
            console.error('获取会话列表失败:', error);

            // Check if this is a directory not found error (ENOENT)
            const isDirectoryNotFound = error &&
                typeof error === 'object' &&
                'code' in error &&
                error.code === 'ENOENT';

            if (isDirectoryNotFound) {
                // For missing Wave directory, silently handle by sending empty sessions list
                console.log('Wave sessions directory does not exist yet, showing empty sessions list');
                if (this.panel) {
                    this.panel.webview.postMessage({
                        command: 'updateSessions',
                        sessions: []
                    });
                }
            } else {
                // For other errors, show the error to the user
                if (this.panel) {
                    this.panel.webview.postMessage({
                        command: 'sessionsError',
                        error: '获取会话列表失败: ' + error
                    });
                }
            }
        }
    }

    private async restoreSession(sessionId: string) {
        if (!sessionId) {
            return;
        }

        if (!this.agent) {
            console.log('智能体未初始化，无法恢复会话');
            return;
        }

        try {
            console.log('恢复会话:', sessionId);

            // Use agent's restoreSession method instead of destroying and recreating
            await this.agent.restoreSession(sessionId);
            console.log('会话恢复成功');

        } catch (error) {
            console.error('恢复会话失败:', error);
            vscode.window.showErrorMessage('恢复会话失败: ' + error);

            if (this.panel) {
                this.panel.webview.postMessage({
                    command: 'sessionsError',
                    error: '恢复会话失败: ' + error
                });
            }
        }
    }

    private async handleFileSuggestionsRequest(filterText: string, requestId: string) {
        try {
            console.log('处理文件建议请求:', filterText, requestId);

            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                if (this.panel) {
                    this.panel.webview.postMessage({
                        command: 'fileSuggestionsResponse',
                        suggestions: [],
                        filterText: filterText,
                        requestId: requestId
                    });
                }
                return;
            }

            // Find files in workspace with intelligent filtering
            const files = await this.findWorkspaceFiles(filterText);

            if (this.panel) {
                this.panel.webview.postMessage({
                    command: 'fileSuggestionsResponse',
                    suggestions: files,
                    filterText: filterText,
                    requestId: requestId
                });
            }

        } catch (error) {
            console.error('获取文件建议失败:', error);
            if (this.panel) {
                this.panel.webview.postMessage({
                    command: 'fileSuggestionsError',
                    error: '获取文件建议失败: ' + error,
                    requestId: requestId
                });
            }
        }
    }

    private async findWorkspaceFiles(filterText: string): Promise<any[]> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return [];
        }

        try {
            const allItems: any[] = [];

            // 1. Get files (existing logic)
            const files = await vscode.workspace.findFiles(
                '**/*',  // Include all files
                '{**/node_modules/**,**/.git/**,**/dist/**,**/build/**,**/.vscode/**}', // Exclude common folders
                100  // Limit to 100 files for performance
            );

            // Convert files to FileItem format
            const fileItems = files.map(uri => {
                const relativePath = vscode.workspace.asRelativePath(uri);
                const path = uri.fsPath;
                const pathSegments = relativePath.split('/');
                const name = pathSegments[pathSegments.length - 1];
                const extensionMatch = name.match(/\.([^.]+)$/);
                const extension = extensionMatch ? extensionMatch[1] : '';

                return {
                    path: path,
                    relativePath: relativePath,
                    name: name,
                    extension: extension,
                    icon: 'codicon-file',      // Simplified: all files use file icon
                    isDirectory: false
                };
            });

            // 2. Get directories (NEW LOGIC)
            const directories = await this.findWorkspaceDirectories(workspaceFolder);

            // Combine files and directories
            allItems.push(...fileItems, ...directories);

            // 3. Filter based on user input
            const filteredItems = allItems.filter(item => {
                if (!filterText) return true;
                const lowerFilter = filterText.toLowerCase();
                return (
                    item.name.toLowerCase().includes(lowerFilter) ||
                    item.relativePath.toLowerCase().includes(lowerFilter)
                );
            });

            // 4. Sort by relevance
            filteredItems.sort((a, b) => {
                const aNameMatch = a.name.toLowerCase().startsWith(filterText.toLowerCase());
                const bNameMatch = b.name.toLowerCase().startsWith(filterText.toLowerCase());

                if (aNameMatch && !bNameMatch) return -1;
                if (!aNameMatch && bNameMatch) return 1;

                // Prefer directories over files (optional)
                if (a.isDirectory && !b.isDirectory) return -1;
                if (!a.isDirectory && b.isDirectory) return 1;

                return a.name.localeCompare(b.name);
            });

            return filteredItems.slice(0, 50); // Limit total results
        } catch (error) {
            console.error('搜索工作区文件失败:', error);
            return [];
        }
    }

    // NEW METHOD: Find directories
    private async findWorkspaceDirectories(workspaceFolder: vscode.WorkspaceFolder): Promise<any[]> {
        const directories: any[] = [];
        const maxDepth = 3; // Limit depth to avoid scanning too deep

        await this.scanDirectoryRecursively(workspaceFolder.uri, '', directories, 0, maxDepth);

        return directories;
    }

    // NEW METHOD: Recursively scan for directories
    private async scanDirectoryRecursively(
        uri: vscode.Uri,
        relativePath: string,
        directories: any[],
        currentDepth: number,
        maxDepth: number
    ): Promise<void> {
        if (currentDepth >= maxDepth) return;

        try {
            const entries = await vscode.workspace.fs.readDirectory(uri);

            for (const [name, type] of entries) {
                if (type === vscode.FileType.Directory) {
                    // Skip common folders to ignore
                    if (['node_modules', '.git', 'dist', 'build', '.vscode'].includes(name)) {
                        continue;
                    }

                    const dirRelativePath = relativePath ? `${relativePath}/${name}` : name;
                    const dirUri = vscode.Uri.joinPath(uri, name);

                    directories.push({
                        path: dirUri.fsPath,
                        relativePath: dirRelativePath,
                        name: name,
                        extension: '',
                        icon: 'codicon-folder',
                        isDirectory: true
                    });

                    // Recurse into subdirectory
                    await this.scanDirectoryRecursively(
                        dirUri,
                        dirRelativePath,
                        directories,
                        currentDepth + 1,
                        maxDepth
                    );
                }
            }
        } catch (error) {
            // Ignore permission errors, etc.
            console.warn('无法扫描目录:', uri.fsPath, error);
        }
    }

    private getFileIcon(extension: string): string {
        // Simplified: only return 'codicon-file'
        // Directory icons are handled in the findWorkspaceFiles method
        return 'codicon-file';
    }

    private updateChatMessages(messages: Message[]) {
        console.log('更新聊天消息:', messages.length);
        if (this.panel) {
            this.panel.webview.postMessage({
                command: 'updateMessages',
                messages: messages // Pass Message objects directly
            });
        }
    }

    private async handleToolPermissionRequest(context: ToolPermissionContext): Promise<PermissionDecision> {
        console.log('handleToolPermissionRequest 被调用:', context.toolName);
        return new Promise((resolve) => {
            const confirmationId = `confirmation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Store the resolve function to call later
            this.pendingConfirmations.set(confirmationId, {
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
            if (this.panel) {
                this.panel.webview.postMessage({
                    command: 'showConfirmation',
                    confirmationId: confirmationId,
                    toolName: context.toolName,
                    confirmationType: confirmationType,
                    toolInput: context.toolInput
                });
            }
        });
    }

    private async handleConfirmationResponse(confirmationId: string, approved: boolean) {
        const pending = this.pendingConfirmations.get(confirmationId);
        if (!pending) {
            console.warn('收到未知确认响应:', confirmationId);
            return;
        }

        this.pendingConfirmations.delete(confirmationId);

        if (approved) {
            pending.resolve({ behavior: 'allow' });
        } else {
            pending.resolve({
                behavior: 'deny',
                message: '用户拒绝了操作'
            });

            // When user rejects, abort the current message
            if (this.agent) {
                try {
                    this.agent.abortMessage();
                    console.log('用户拒绝操作，已中止消息');
                } catch (error) {
                    console.error('中止消息时出错:', error);
                }
            }
        }
    }

    private async handleSessionIdChange(sessionId: string) {
        console.log('🔄 处理会话ID变更:', sessionId);
        if (this.panel && this.agent) {
            console.log('📤 发送updateCurrentSession消息，新session ID:', sessionId);
            // Update current session info
            this.panel.webview.postMessage({
                command: 'updateCurrentSession',
                session: {
                    id: sessionId,
                    sessionType: 'main',
                    workdir: this.agent.workingDirectory,
                    lastActiveAt: new Date(),
                    latestTotalTokens: this.agent.latestTotalTokens
                } as SessionMetadata
            });
            
            console.log('🔄 刷新会话列表...');
        }
    }



    private getWebviewContent(): string {
        const scriptUri = this.panel!.webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'webview', 'dist', 'chat.js')
        );

        // Add codicon CSS URI
        const codiconUri = this.panel!.webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', '@vscode', 'codicons', 'dist', 'codicon.css')
        );

        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this.panel!.webview.cspSource} 'unsafe-inline'; script-src ${this.panel!.webview.cspSource}; font-src ${this.panel!.webview.cspSource};">
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
        
        // Destroy the agent if it exists
        if (this.agent) {
            try {
                await this.agent.destroy();
                console.log('智能体销毁成功');
            } catch (error) {
                console.error('销毁智能体时出错:', error);
            }
            this.agent = undefined;
        }
        
        // Close the webview panel if it exists
        if (this.panel) {
            this.panel.dispose();
            this.panel = undefined;
        }
        
        console.log('ChatProvider 资源清理完成');
    }
}