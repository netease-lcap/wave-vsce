import * as vscode from 'vscode';
import { Agent, Message, TextBlock, ToolBlock, ErrorBlock, listSessions, SessionMetadata } from 'wave-agent-sdk';
import type { MessageManagerCallbacks } from 'wave-agent-sdk/dist/managers/messageManager';
import type { AgentToolBlockUpdateParams } from 'wave-agent-sdk/dist/utils/messageOperations';

export class ChatProvider {
    private static readonly viewType = 'waveChatView';
    private panel: vscode.WebviewPanel | undefined;
    private agent: Agent | undefined;
    private context: vscode.ExtensionContext;

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
                restoreSessionId
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
            case 'getWorkspaceInfo':
                await this.sendWorkspaceInfo();
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
        }
    }

    private async sendMessageToAgent(text: string) {
        if (!this.agent) {
            vscode.window.showErrorMessage('智能体未初始化');
            return;
        }

        try {
            console.log('发送消息给智能体:', text);
            await this.agent.sendMessage(text);
            console.log('智能体 sendMessage 完成');
        } catch (error) {
            console.error('发送消息给智能体时出错:', error);
            vscode.window.showErrorMessage('发送消息失败: ' + error);
        }
    }

    private async sendWorkspaceInfo() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            await this.sendMessageToAgent('在 VS Code 中当前没有打开工作区。');
            return;
        }

        const workspaceInfo = `当前工作区: ${workspaceFolder.name} 位于 ${workspaceFolder.uri.fsPath}`;
        await this.sendMessageToAgent(`请分析当前项目。${workspaceInfo}`);
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
            if (this.panel) {
                this.panel.webview.postMessage({
                    command: 'sessionsError',
                    error: '获取会话列表失败: ' + error
                });
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

    private updateChatMessages(messages: Message[]) {
        console.log('更新聊天消息:', messages.length);
        if (this.panel) {
            this.panel.webview.postMessage({
                command: 'updateMessages',
                messages: messages // Pass Message objects directly
            });
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

        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this.panel!.webview.cspSource} 'unsafe-inline'; script-src ${this.panel!.webview.cspSource};">
    <title>Wave AI Chat</title>
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