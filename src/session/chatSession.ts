import * as vscode from 'vscode';
import { Agent, Message, PermissionDecision, ToolPermissionContext, AgentCallbacks } from 'wave-agent-sdk';
import { ConfigurationData } from '../services/configurationService';

export interface ChatSessionCallbacks {
    onMessagesChange: (messages: Message[]) => void;
    onSessionIdChange: (sessionId: string) => void;
    onSubagentMessagesChange: (subagentId: string, messages: Message[]) => void;
    onStreamingChange: (isStreaming: boolean) => void;
    onToolPermissionRequest: (context: ToolPermissionContext) => Promise<PermissionDecision>;
    onError: (error: any) => void;
}

export class ChatSession {
    public agent: Agent | undefined;
    public messages: Message[] = [];
    public sessionId: string | undefined;
    public isStreaming: boolean = false;
    public isInitializing: boolean = false;
    public pendingConfirmations: Map<string, { 
        resolve: (decision: PermissionDecision) => void; 
        toolName: string;
        confirmationType: string;
        toolInput: any;
    }> = new Map();

    private updateTimer: NodeJS.Timeout | undefined;
    private pendingUpdate: boolean = false;
    private forceNextUpdateImmediate: boolean = false;

    constructor(
        public readonly viewType: 'sidebar' | 'tab' | 'window',
        public readonly windowId: string | undefined,
        private callbacks: ChatSessionCallbacks
    ) {}

    public async initialize(config: ConfigurationData, restoreSessionId?: string) {
        if (this.isInitializing) {
            return;
        }

        this.isInitializing = true;
        try {
            console.log(`正在初始化 ${this.viewType} 视图的智能体...`, this.windowId ? `窗口ID: ${this.windowId}` : '');
            
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            const workdir = workspaceFolder?.uri.fsPath;
            
            if (workdir) {
                console.log(`设置智能体工作目录为: ${workdir}`);
            }
            
            if (!config.apiKey || !config.baseURL || !config.agentModel || !config.fastModel) {
                throw new Error('请先在设置中配置 API Key, Base URL 和模型名称');
            }
            
            const agentCallbacks: AgentCallbacks = {
                onMessagesChange: (messages: Message[]) => {
                    this.throttledUpdateChatMessages(messages);
                },
                onSessionIdChange: (sessionId: string) => {
                    this.sessionId = sessionId;
                    this.callbacks.onSessionIdChange(sessionId);
                },
                onSubagentMessagesChange: (subagentId: string, messages: Message[]) => {
                    this.callbacks.onSubagentMessagesChange(subagentId, messages);
                }
            };

            this.agent = await Agent.create({
                logger: console,
                callbacks: agentCallbacks,
                workdir,
                restoreSessionId,
                apiKey: config.apiKey,
                baseURL: config.baseURL,
                agentModel: config.agentModel,
                fastModel: config.fastModel,
                canUseTool: async (context: ToolPermissionContext): Promise<PermissionDecision> => {
                    return await this.callbacks.onToolPermissionRequest(context);
                }
            });
            
            console.log(`${this.viewType} 智能体初始化成功`);
            
        } catch (error) {
            console.error(`初始化 ${this.viewType} 智能体失败:`, error);
            this.callbacks.onError(error);
        } finally {
            this.isInitializing = false;
        }
    }

    public async sendMessage(text: string, images?: Array<{ data: string; mediaType: string; }>) {
        if (!this.agent) {
            throw new Error('智能体未初始化');
        }

        try {
            this.isStreaming = true;
            this.callbacks.onStreamingChange(true);
            
            let processedImages: Array<{ path: string; mimeType: string; }> | undefined;
            if (images && images.length > 0) {
                processedImages = images.map(image => ({
                    path: image.data,
                    mimeType: image.mediaType
                }));
            }
            
            await this.agent.sendMessage(text, processedImages);
            
            this.isStreaming = false;
            this.callbacks.onStreamingChange(false);
        } catch (error) {
            this.isStreaming = false;
            this.callbacks.onStreamingChange(false);
            throw error;
        }
    }

    public abortMessage() {
        if (this.agent) {
            this.agent.abortMessage();
        }
    }

    public async clearChat() {
        if (this.agent) {
            this.forceNextUpdateImmediate = true;
            await this.agent.sendMessage('/clear');
        }
    }

    public async restoreSession(sessionId: string) {
        if (this.agent) {
            this.forceNextUpdateImmediate = true;
            await this.agent.restoreSession(sessionId);
        }
    }

    public updateConfig(config: ConfigurationData) {
        if (this.agent) {
            this.agent.updateConfig({
                gateway: {
                    apiKey: config.apiKey,
                    baseURL: config.baseURL
                },
                model: {
                    agentModel: config.agentModel,
                    fastModel: config.fastModel
                }
            });
        }
    }

    public getSlashCommands() {
        if (this.agent) {
            return this.agent.getSlashCommands();
        }
        return [];
    }

    private immediateUpdateChatMessages() {
        if (this.updateTimer) {
            clearTimeout(this.updateTimer);
            this.updateTimer = undefined;
        }
        this.pendingUpdate = false;
        this.callbacks.onMessagesChange(this.messages);
    }

    private throttledUpdateChatMessages(messages: Message[]) {
        this.messages = messages;
        
        if (this.forceNextUpdateImmediate) {
            this.forceNextUpdateImmediate = false;
            this.immediateUpdateChatMessages();
            return;
        }

        if (this.pendingUpdate) {
            return;
        }
        
        this.pendingUpdate = true;
        this.updateTimer = setTimeout(() => {
            this.callbacks.onMessagesChange(this.messages);
            this.pendingUpdate = false;
            this.updateTimer = undefined;
        }, 100);
    }

    public async destroy() {
        if (this.updateTimer) {
            clearTimeout(this.updateTimer);
            this.updateTimer = undefined;
        }
        
        if (this.agent) {
            try {
                await this.agent.destroy();
            } catch (error) {
                console.error(`销毁 ${this.viewType} agent 时出错:`, error);
            }
            this.agent = undefined;
        }
        
        this.messages = [];
        this.sessionId = undefined;
        this.pendingConfirmations.clear();
        this.isStreaming = false;
        this.pendingUpdate = false;
    }
}
