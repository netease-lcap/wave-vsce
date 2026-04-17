import * as vscode from 'vscode';
import { Agent, Message, PermissionDecision, ToolPermissionContext, AgentCallbacks, PermissionMode, Task, PromptHistoryManager, TextBlock, QueuedMessage } from 'wave-agent-sdk';
import { ConfigurationData } from '../services/configurationService';
import { VscodeLspAdapter } from '../services/lspAdapter';

export interface ChatSessionCallbacks {
    onMessagesChange: (messages: Message[]) => void;
    onTasksChange: (tasks: Task[]) => void;
    onSessionIdChange: (sessionId: string) => void;
    onStreamingChange: (isStreaming: boolean) => void;
    onQueueChange: (queue: QueuedMessage[]) => void;
    onCommandRunningChange: (running: boolean) => void;
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
    public isCommandRunning: boolean = false;
    public isInitializing: boolean = false;
    public inputContent: string = '';
    public messageQueue: QueuedMessage[] = [];
    public pendingConfirmations: Map<string, { 
        resolve: (decision: PermissionDecision) => void; 
        toolName: string;
        confirmationType: string;
        toolInput: any;
        planContent?: string;
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
                },
                onLoadingChange: (loading: boolean) => {
                    this.isStreaming = loading;
                    this.callbacks.onStreamingChange(loading);
                },
                onCommandRunningChange: (running: boolean) => {
                    this.isCommandRunning = running;
                    this.callbacks.onCommandRunningChange(running);
                },
                onQueuedMessagesChange: (messages: QueuedMessage[]) => {
                    this.messageQueue = messages;
                    this.callbacks.onQueueChange(messages);
                }
            };

            const createAgent = async (restoreId?: string) => {
                return await Agent.create({
                    logger: extensionMode === vscode.ExtensionMode.Development ? console : {
                        info: (...args: any[]) => console.info(...args),
                        warn: (...args: any[]) => console.warn(...args),
                        error: (...args: any[]) => console.error(...args),
                        debug: () => {},
                    },
                    callbacks: agentCallbacks,
                    workdir,
                    restoreSessionId: restoreId,
                    apiKey: config.apiKey || undefined,
                    defaultHeaders: this.parseHeaders(config.headers),
                    baseURL: config.baseURL || undefined,
                    model: config.model,
                    fastModel: config.fastModel,
                    language: config.language,
                    lspManager: new VscodeLspAdapter(),
                    canUseTool: async (context: ToolPermissionContext): Promise<PermissionDecision> => {
                        return await this.callbacks.onToolPermissionRequest(context);
                    }
                });
            };

            try {
                this.agent = await createAgent(restoreSessionId);
            } catch (createError) {
                // If session not found, retry without restoreSessionId (new session)
                if (createError instanceof Error && createError.message.startsWith('Session not found:')) {
                    console.log(`${this.viewType} 会话文件不存在，以新会话模式重新初始化`);
                    this.agent = await createAgent(undefined);
                } else {
                    throw createError;
                }
            }

            // 同步 sessionId 从 agent 到 ChatSession
            // 因为 MessageManager 构造函数中设置 sessionId 不会触发 onSessionIdChange 回调
            if (this.agent && this.sessionId !== this.agent.sessionId) {
                this.sessionId = this.agent.sessionId;
                this.callbacks.onSessionIdChange(this.sessionId);
            }

            console.log(`${this.viewType} 智能体初始化成功`);
            
        } catch (error) {
            console.error(`初始化 ${this.viewType} 智能体失败:`, error);
            this.callbacks.onError(error);
        } finally {
            this.isInitializing = false;
        }
    }

    public async sendMessage(text: string, images?: Array<{ data: string; mediaType: string; }>, force: boolean = false) {
        if (!this.agent) {
            throw new Error('智能体未初始化');
        }

        if (this.isStreaming && force) {
            this.agent.abortMessage();
            // SDK will re-enqueue automatically via abortMessage clearing the queue,
            // then the caller should re-send after abort.
        }

        let processedImages: Array<{ path: string; mimeType: string; }> | undefined;
        if (images && images.length > 0) {
            processedImages = images.map(image => ({
                path: image.data,
                mimeType: image.mediaType
            }));
        }
        
        // Save prompt to history
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            const workdir = workspaceFolder?.uri.fsPath;
            await PromptHistoryManager.addEntry(text, this.sessionId, {}, workdir);
        } catch (error) {
            console.error('Failed to save prompt to history:', error);
        }
        
        // SDK handles queueing internally when agent is busy
        if (text.startsWith('!')) {
            await this.agent.bang(text.slice(1));
        } else {
            await this.agent.sendMessage(text, processedImages);
        }
    }

    public deleteQueuedMessage(index: number) {
        if (!this.agent) return;
        // Use SDK's removeQueuedMessage to delete from the internal queue
        this.agent.removeQueuedMessage(index);
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
            this.agent.clearMessages();
            this.throttledUpdateChatMessages([]);
        }
        this.clearQueue();
    }

    private clearQueue() {
        if (this.agent && this.agent.queuedMessages.length > 0) {
            this.agent.abortMessage();
        } else if (this.messageQueue.length > 0) {
            this.messageQueue = [];
            this.callbacks.onQueueChange(this.messageQueue);
        }
    }

    public async restoreSession(sessionId: string) {
        if (this.agent) {
            this.forceNextUpdateImmediate = true;
            this.inputContent = '';
            await this.agent.restoreSession(sessionId);
        }
        this.clearQueue();
    }

    public async updateConfig(config: ConfigurationData, extensionMode: vscode.ExtensionMode) {
        if (this.agent) {
            const currentSessionId = this.sessionId;
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            const workdir = workspaceFolder?.uri.fsPath;
            console.log(`[updateConfig] ${this.viewType} 开始更新配置，sessionId: ${currentSessionId}, workdir: ${workdir}`);
            console.log(`[updateConfig] ${this.viewType} 当前 agent.sessionId: ${this.agent.sessionId}`);

            // 重置 streaming 状态
            if (this.isStreaming) {
                this.isStreaming = false;
                this.callbacks.onStreamingChange(false);
            }

            // 销毁当前 agent，但不清除消息和会话 ID，因为我们要恢复它们
            try {
                await this.agent.destroy();
            } catch (error) {
                console.error(`[updateConfig] 销毁旧 agent 时出错:`, error);
            }
            this.agent = undefined;

            // 重新初始化（如果会话文件不存在会自动以新会话模式初始化）
            await this.initialize(config, extensionMode, currentSessionId);
            console.log(`[updateConfig] ${this.viewType} 配置更新完成，sessionId: ${this.sessionId}`);
        } else {
            console.log(`[updateConfig] ${this.viewType} agent 为 undefined，跳过更新`);
        }
        this.clearQueue();
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

        // leading edge: first call fires immediately
        if (!this.pendingUpdate && !this.updateTimer) {
            this.callbacks.onMessagesChange(this.messages);
            this.pendingUpdate = true;
            // trailing edge: fire the last update after 300ms cooldown
            this.updateTimer = setTimeout(() => {
                this.callbacks.onMessagesChange(this.messages);
                this.pendingUpdate = false;
                this.updateTimer = undefined;
            }, 300);
        }
    }

    public async setPermissionMode(mode: PermissionMode) {
        if (this.agent) {
            await this.agent.setPermissionMode(mode);
        }
    }

    public async rewindToMessage(messageId: string) {
        if (!this.agent) {
            throw new Error('智能体未初始化');
        }

        const { messages } = await this.agent.getFullMessageThread();
        const index = messages.findIndex(m => m.id === messageId);
        
        if (index === -1) {
            throw new Error(`未找到 ID 为 ${messageId} 的消息`);
        }

        const messageToRevert = messages[index];
        const textBlock = messageToRevert.blocks.find(b => b.type === 'text') as TextBlock | undefined;
        this.inputContent = textBlock?.content || '';

        // Truncate starting from the selected message to remove it
        await this.agent.truncateHistory(index);

        // Update local messages and notify frontend
        const { messages: updatedMessages } = await this.agent.getFullMessageThread();
        this.throttledUpdateChatMessages(updatedMessages);
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
        this.isCommandRunning = false;
        this.pendingUpdate = false;
        this.messageQueue = [];
    }
}
