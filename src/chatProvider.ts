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
        console.log('ChatProvider created');
        
        // Listen for workspace folder changes (for logging/awareness only)
        // Note: Agent workdir remains unchanged for secondary folder changes due to single workdir limitation
        const workspaceChangeListener = vscode.workspace.onDidChangeWorkspaceFolders((event) => {
            console.log('Workspace folders changed:', {
                added: event.added.map(f => f.uri.fsPath),
                removed: event.removed.map(f => f.uri.fsPath)
            });
            
            if (event.added.length > 0 || event.removed.length > 0) {
                const currentFirst = vscode.workspace.workspaceFolders?.[0];
                console.log('Current first workspace folder:', currentFirst?.uri.fsPath || 'none');
                console.log('Note: Agent working directory remains unchanged (single workdir limitation)');
            }
        });
        
        this.context.subscriptions.push(workspaceChangeListener);
    }

    private async initializeAgent() {
        try {
            console.log('Initializing Agent with proper streaming handling...');
            
            // Detect current workspace folder for agent working directory
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            const workdir = workspaceFolder?.uri.fsPath;
            
            if (workdir) {
                console.log(`Setting agent working directory to: ${workdir}`);
            } else {
                console.log('No workspace folder detected, using default working directory');
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
                    console.log('Streaming content - chunk:', chunk.length, 'total:', accumulated.length);
                    this.isStreaming = true;
                    this.accumulatedContent = accumulated;
                    this.updateStreamingContent(chunk, accumulated);
                },
                onAssistantMessageAdded: () => {
                    console.log('Assistant message started - begin streaming');
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
                    console.log('Tool block updated:', params);
                    this.updateToolStatus(params);
                    
                    // When tool execution ends, streaming is complete
                    if (params.stage === 'end') {
                        this.isStreaming = false;
                        this.accumulatedContent = '';
                    }
                },
                onErrorBlockAdded: (error: string) => {
                    console.log('Error:', error);
                    this.isStreaming = false;
                    this.accumulatedContent = '';
                    this.showError(error);
                }
            };

            this.agent = await Agent.create({
                callbacks,
                workdir
            });
            
            console.log('Agent initialized successfully');
        } catch (error) {
            console.error('Failed to initialize agent:', error);
            vscode.window.showErrorMessage('Failed to initialize AI agent: ' + error);
        }
    }

    public async createOrShowChatPanel() {
        console.log('createOrShowChatPanel called');
        
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
                'Wave AI Chat',
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
            vscode.window.showErrorMessage('Agent not initialized');
            return;
        }

        try {
            console.log('Sending message to agent:', text);
            this.isStreaming = false; // Reset streaming state
            this.accumulatedContent = ''; // Clear accumulated content
            this.isAborted = false; // Reset abort flag
            await this.agent.sendMessage(text);
        } catch (error) {
            console.error('Error sending message to agent:', error);
            this.isStreaming = false;
            this.accumulatedContent = '';
            this.isAborted = false;
            vscode.window.showErrorMessage('Failed to send message: ' + error);
        }
    }

    private async sendWorkspaceInfo() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            await this.sendMessageToAgent('No workspace is currently open in VS Code.');
            return;
        }

        const workspaceInfo = `Current workspace: ${workspaceFolder.name} at ${workspaceFolder.uri.fsPath}`;
        await this.sendMessageToAgent(`Please analyze the current project. ${workspaceInfo}`);
    }

    private async abortMessage() {
        if (!this.agent || !this.isStreaming) {
            console.log('No message to abort or agent not initialized');
            return;
        }

        try {
            console.log('Aborting message with partial content:', this.accumulatedContent.slice(0, 100) + '...');
            
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
            
            console.log('Message aborted successfully');
        } catch (error) {
            console.error('Error aborting message:', error);
            this.isAborted = false; // Reset flag on error
            vscode.window.showErrorMessage('Failed to abort message: ' + error);
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
        console.log('Updating final chat messages:', messages.length);
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
        console.log('ChatProvider destroying resources...');
        
        // Destroy the agent if it exists
        if (this.agent) {
            try {
                await this.agent.destroy();
                console.log('Agent destroyed successfully');
            } catch (error) {
                console.error('Error destroying agent:', error);
            }
            this.agent = undefined;
        }
        
        // Close the webview panel if it exists
        if (this.panel) {
            this.panel.dispose();
            this.panel = undefined;
        }
        
        console.log('ChatProvider resources cleaned up');
    }
}