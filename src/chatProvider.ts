import * as vscode from 'vscode';
import { Agent, Message, TextBlock, ToolBlock } from 'wave-agent-sdk';
import type { MessageManagerCallbacks } from 'wave-agent-sdk/dist/managers/messageManager';
import type { AgentToolBlockUpdateParams } from 'wave-agent-sdk/dist/utils/messageOperations';

export class ChatProvider {
    private static readonly viewType = 'waveChatView';
    private panel: vscode.WebviewPanel | undefined;
    private agent: Agent | undefined;
    private context: vscode.ExtensionContext;
    private isStreaming = false;
    private accumulatedContent = '';
    private isAborted = false;

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

    private async initializeAgent() {
        try {
            console.log('正在初始化智能体，带有正确的流式处理...');
            
            // Detect current workspace folder for agent working directory
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            const workdir = workspaceFolder?.uri.fsPath;
            
            if (workdir) {
                console.log(`设置智能体工作目录为: ${workdir}`);
            } else {
                console.log('未检测到工作区文件夹，使用默认工作目录');
            }
            
            const callbacks: MessageManagerCallbacks = {
                onMessagesChange: (messages: Message[]) => {
                    // Only update the full UI when not actively streaming and not just aborted
                    if (!this.isStreaming && !this.isAborted) {
                        this.updateChatMessages(messages);
                    } else if (this.isAborted) {
                        this.isAborted = false; // Reset flag after skipping one update
                    }
                },
                onAssistantContentUpdated: (chunk: string, accumulated: string) => {
                    console.log('流式内容 - 块:', chunk.length, '总计:', accumulated.length);
                    this.isStreaming = true;
                    this.accumulatedContent = accumulated;
                    this.updateStreamingContent(chunk, accumulated);
                },
                onAssistantMessageAdded: () => {
                    console.log('助手消息开始 - 开始流式传输');
                    this.isStreaming = true;
                    this.accumulatedContent = '';
                    this.isAborted = false; // Reset abort flag for new message
                    if (this.panel) {
                        this.panel.webview.postMessage({
                            command: 'startStreaming'
                        });
                    }
                },
                onToolBlockUpdated: (params: AgentToolBlockUpdateParams) => {
                    console.log('工具块已更新:', params);
                    this.updateToolStatus(params);
                    
                    // When tool execution ends, streaming is complete
                    if (params.stage === 'end') {
                        this.isStreaming = false;
                        this.accumulatedContent = '';
                    }
                },
                onErrorBlockAdded: (error: string) => {
                    console.log('错误:', error);
                    this.isStreaming = false;
                    this.accumulatedContent = '';
                    this.showError(error);
                }
            };

            this.agent = await Agent.create({
                callbacks,
                workdir
            });
            
            console.log('智能体初始化成功');
        } catch (error) {
            console.error('初始化智能体失败:', error);
            vscode.window.showErrorMessage('初始化 AI 智能体失败: ' + error);
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
        }
    }

    private async sendMessageToAgent(text: string) {
        if (!this.agent) {
            vscode.window.showErrorMessage('智能体未初始化');
            return;
        }

        try {
            console.log('发送消息给智能体:', text);
            this.isStreaming = false; // Reset streaming state
            this.accumulatedContent = ''; // Clear accumulated content
            this.isAborted = false; // Reset abort flag
            
            await this.agent.sendMessage(text);
            
            // After agent.sendMessage() completes, immediately reset streaming state
            console.log('智能体 sendMessage 完成 - 重置流式状态');
            this.isStreaming = false;
            this.accumulatedContent = '';
            
            // Explicitly tell webview to reset UI state if it hasn't been reset already
            if (this.panel) {
                this.panel.webview.postMessage({
                    command: 'ensureUIReset'
                });
            }
            
        } catch (error) {
            console.error('发送消息给智能体时出错:', error);
            this.isStreaming = false;
            this.accumulatedContent = '';
            this.isAborted = false;
            
            // Reset UI state in webview when error occurs
            if (this.panel) {
                this.panel.webview.postMessage({
                    command: 'showError',
                    error: `发送消息失败: ${error}`
                });
            }
            
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
        if (!this.agent || !this.isStreaming) {
            console.log('没有消息需要中止或智能体未初始化');
            return;
        }

        try {
            console.log('正在中止消息，部分内容:', this.accumulatedContent.slice(0, 100) + '...');
            
            // Set abort flag to prevent onMessagesChange from overwriting our abort display
            this.isAborted = true;
            
            // Call the agent's abort method
            this.agent.abortMessage();
            
            // Send the partial content to the webview with abort indicator
            if (this.panel) {
                this.panel.webview.postMessage({
                    command: 'messageAborted',
                    partialContent: this.accumulatedContent
                });
            }
            
            // Reset streaming state
            this.isStreaming = false;
            this.accumulatedContent = '';
            
            console.log('消息中止成功');
        } catch (error) {
            console.error('中止消息时出错:', error);
            this.isAborted = false; // Reset flag on error
            vscode.window.showErrorMessage('中止消息失败: ' + error);
        }
    }

    private async clearChat() {
        if (this.agent) {
            await this.initializeAgent();
            if (this.panel) {
                this.panel.webview.postMessage({
                    command: 'clearMessages'
                });
            }
        }
    }

    private updateChatMessages(messages: Message[]) {
        console.log('更新最终聊天消息:', messages.length);
        if (this.panel) {
            const displayMessages = messages.map(msg => this.convertMessageForDisplay(msg));
            this.panel.webview.postMessage({
                command: 'updateMessages',
                messages: displayMessages
            });
        }
        this.isStreaming = false; // Ensure streaming state is reset
        this.accumulatedContent = ''; // Clear accumulated content
    }

    private convertMessageForDisplay(message: Message) {
        const textBlocks = message.blocks?.filter(block => block.type === 'text') as TextBlock[] || [];
        const content = textBlocks.map(block => block.content).join('\n') || '';
        
        const toolBlocks = message.blocks?.filter(block => block.type === 'tool') as ToolBlock[] || [];
        const tool_calls = toolBlocks.map(tool => ({
            function: {
                name: tool.name || 'unknown',
                arguments: JSON.stringify(tool.parameters || {})
            }
        }));

        return {
            role: message.role,
            content: content,
            tool_calls: tool_calls.length > 0 ? tool_calls : undefined
        };
    }

    private updateStreamingContent(chunk: string, accumulated: string) {
        if (this.panel && accumulated) {
            this.panel.webview.postMessage({
                command: 'updateStreaming',
                accumulated: accumulated
            });
        }
    }

    private updateToolStatus(params: any) {
        if (this.panel) {
            this.panel.webview.postMessage({
                command: 'updateTool',
                params: params
            });
        }
    }

    private showError(error: string) {
        if (this.panel) {
            this.panel.webview.postMessage({
                command: 'showError',
                error: error
            });
        }
    }

    private getWebviewContent(): string {
        const scriptUri = this.panel!.webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'webview', 'chat.js')
        );
        const styleUri = this.panel!.webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'webview', 'chat.css')
        );

        // Read HTML template and replace placeholders
        const htmlPath = vscode.Uri.joinPath(this.context.extensionUri, 'webview', 'chat.html');
        const htmlTemplate = require('fs').readFileSync(htmlPath.fsPath, 'utf8');
        
        return htmlTemplate
            .replace('{{SCRIPT_URI}}', scriptUri.toString())
            .replace('{{STYLE_URI}}', styleUri.toString());
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