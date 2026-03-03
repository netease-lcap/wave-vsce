import * as vscode from 'vscode';
import { Agent, Message, PermissionDecision, ToolPermissionContext, AgentCallbacks, PermissionMode, Task } from 'wave-agent-sdk';
import { SelectionInfo } from '../services/selectionService';
import { ConfigurationData } from '../services/configurationService';
import { VscodeLspAdapter } from '../services/lspAdapter';

export interface ChatSessionCallbacks {
    onMessagesChange: (messages: Message[]) => void;
    onTasksChange: (tasks: Task[]) => void;
    onSessionIdChange: (sessionId: string) => void;
    onStreamingChange: (isStreaming: boolean) => void;
    onPermissionModeChange: (mode: PermissionMode) => void;
    onToolPermissionRequest: (context: ToolPermissionContext) => Promise<PermissionDecision>;
    onError: (error: any) => void;
}

export class ChatSession {
    public agent: Agent | undefined;
    public messages: Message[] = [];
    public tasks: Task[] = [];
    public sessionId: string | undefined;
    public isStreaming: boolean = false;
    public isInitializing: boolean = false;
    public inputContent: string = '';
    public pendingConfirmations: Map<string, { 
        resolve: (decision: PermissionDecision) => void; 
        toolName: string;
        confirmationType: string;
        toolInput: any;
        suggestedPrefix?: string;
        hidePersistentOption?: boolean;
    }> = new Map();

    private updateTimer: NodeJS.Timeout | undefined;
    private pendingUpdate: boolean = false;
    private forceNextUpdateImmediate: boolean = false;

    constructor(
        public readonly viewType: 'sidebar' | 'tab' | 'window',
        public readonly windowId: string | undefined,
        private callbacks: ChatSessionCallbacks
    ) {}

    public async initialize(config: ConfigurationData, extensionMode: vscode.ExtensionMode, restoreSessionId?: string) {
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
            
            const isAuthValid = (!!config.apiKey || !!process.env.WAVE_API_KEY) 
                || (!!config.headers || !!process.env.WAVE_CUSTOM_HEADERS);
            const isBaseURLValid = !!config.baseURL || !!process.env.WAVE_BASE_URL;

            const agentCallbacks: AgentCallbacks = {
                onMessagesChange: (messages: Message[]) => {
                    this.throttledUpdateChatMessages(messages);
                },
                onTasksChange: (tasks: Task[]) => {
                    this.tasks = tasks;
                    this.callbacks.onTasksChange(tasks);
                },
                onSessionIdChange: (sessionId: string) => {
                    this.sessionId = sessionId;
                    this.callbacks.onSessionIdChange(sessionId);
                },
                onPermissionModeChange: (mode: PermissionMode) => {
                    this.callbacks.onPermissionModeChange(mode);
                }
            };

            this.agent = await Agent.create({
                logger: extensionMode === vscode.ExtensionMode.Development ? console : {
                    info: (...args: any[]) => console.info(...args),
                    warn: (...args: any[]) => console.warn(...args),
                    error: (...args: any[]) => console.error(...args),
                    debug: () => {},
                },
                callbacks: agentCallbacks,
                workdir,
                restoreSessionId,
                apiKey: config.apiKey || undefined,
                defaultHeaders: this.parseHeaders(config.headers),
                baseURL: config.baseURL || undefined,
                model: config.agentModel,
                fastModel: config.fastModel,
                language: config.language,
                lspManager: new VscodeLspAdapter(),
                canUseTool: async (context: ToolPermissionContext): Promise<PermissionDecision> => {
                    return await this.callbacks.onToolPermissionRequest(context);
                }
            } as any);
            
            console.log(`${this.viewType} 智能体初始化成功`);
            
        } catch (error) {
            console.error(`初始化 ${this.viewType} 智能体失败:`, error);
            this.callbacks.onError(error);
        } finally {
            this.isInitializing = false;
        }
    }

    public async sendMessage(text: string, images?: Array<{ data: string; mediaType: string; }>, selection?: SelectionInfo) {
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
            
            let fullText = text;
            if (selection && !text.trim().startsWith('/clear')) {
                const selectionHeader = `\n\n[Selection: ${selection.fileName}#${selection.startLine}-${selection.endLine}]`;
                fullText += selectionHeader;
            }
            
            await this.agent.sendMessage(fullText, processedImages);
            
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
            this.inputContent = '';
            await this.agent.sendMessage('/clear');
        }
    }

    public async restoreSession(sessionId: string) {
        if (this.agent) {
            this.forceNextUpdateImmediate = true;
            this.inputContent = '';
            await this.agent.restoreSession(sessionId);
        }
    }

    public async updateConfig(config: ConfigurationData, extensionMode: vscode.ExtensionMode) {
        if (this.agent) {
            const currentSessionId = this.sessionId;
            console.log(`正在重新创建 ${this.viewType} 智能体以更新配置...`);
            
            // 销毁当前 agent，但不清除消息和会话 ID，因为我们要恢复它们
            try {
                await this.agent.destroy();
            } catch (error) {
                console.error(`销毁旧 agent 时出错:`, error);
            }
            this.agent = undefined;

            // 重新初始化
            await this.initialize(config, extensionMode, currentSessionId);
        }
    }

    private parseHeaders(headersStr?: string): Record<string, string> | undefined {
        if (!headersStr || !headersStr.trim()) {
            return undefined;
        }
        try {
            return JSON.parse(headersStr);
        } catch (e) {
            console.error('Failed to parse headers:', e);
            return undefined;
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

    public async setPermissionMode(mode: PermissionMode) {
        if (this.agent) {
            await this.agent.setPermissionMode(mode);
        }
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
        this.tasks = [];
        this.inputContent = '';
        this.sessionId = undefined;
        this.pendingConfirmations.clear();
        this.isStreaming = false;
        this.pendingUpdate = false;
    }
}
