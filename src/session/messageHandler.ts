import * as vscode from 'vscode';
import * as path from 'path';
import { ChatSession } from './chatSession';
import { ConfigurationService } from '../services/configurationService';
import { FileService } from '../services/fileService';
import { KnowledgeBaseService } from '../services/kbService';
import { SessionService } from '../services/sessionService';
import { SessionMetadata } from 'wave-agent-sdk';

export interface MessageHandlerContext {
    getChatSession: (viewType: 'sidebar' | 'tab' | 'window', windowId?: string) => ChatSession;
    postMessage: (message: any, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) => void;
    initializeAgent: (viewType: 'sidebar' | 'tab' | 'window', windowId?: string, restoreSessionId?: string) => Promise<void>;
    listSessions: (viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) => Promise<void>;
    updateAllSessionsConfig: (config: any) => void;
}

export class MessageHandler {
    private configService: ConfigurationService;
    private fileService: FileService;
    private kbService: KnowledgeBaseService;
    private sessionService: SessionService;
    private context: MessageHandlerContext;

    constructor(
        configService: ConfigurationService,
        fileService: FileService,
        kbService: KnowledgeBaseService,
        sessionService: SessionService,
        context: MessageHandlerContext
    ) {
        this.configService = configService;
        this.fileService = fileService;
        this.kbService = kbService;
        this.sessionService = sessionService;
        this.context = context;
    }

    public async handleMessage(message: any, viewType: 'sidebar' | 'tab' | 'window', windowId?: string) {
        switch (message.command) {
            case 'sendMessage':
                await this.sendMessageToAgent(message.text, message.images, viewType, windowId);
                break;
            case 'clearChat':
                await this.clearChat(viewType, windowId);
                break;
            case 'abortMessage':
                await this.abortMessage(viewType, windowId);
                break;
            case 'listSessions':
                await this.context.listSessions(viewType, windowId);
                break;
            case 'restoreSession':
                await this.restoreSession(message.sessionId, viewType, windowId);
                break;
            case 'requestFileSuggestions':
                await this.handleFileSuggestionsRequest(message.filterText, message.requestId, viewType, windowId);
                break;
            case 'requestSlashCommands':
                await this.handleSlashCommandsRequest(message.filterText, viewType, windowId);
                break;
            case 'confirmationResponse':
                await this.handleConfirmationResponse(message.confirmationId, message.approved, viewType, windowId);
                break;
            case 'getConfiguration':
                await this.handleGetConfiguration(viewType, windowId);
                break;
            case 'updateConfiguration':
                await this.handleUpdateConfiguration(message.configurationData, viewType, windowId);
                await this.handleGetConfiguration(viewType, windowId);
                break;
            case 'uploadFilesToArtifacts':
                await this.handleUploadFilesToArtifacts(message.files, viewType, windowId);
                break;
            case 'downloadKbFile':
                await this.handleDownloadKbFile(message.fileId, message.fileName, message.backendLink, viewType, windowId);
                break;
            case 'getKbItems':
                await this.handleGetKbItems(message.level, message.kbId, message.folderId, message.backendLink, viewType, windowId);
                break;
            case 'showError':
                vscode.window.showErrorMessage(message.message);
                break;
            case 'downloadMermaid':
                await this.handleDownloadMermaid(message.content, message.format, viewType, windowId);
                break;
            case 'webviewReady':
                await this.handleWebviewReady(viewType, windowId);
                break;
        }
    }

    private async handleDownloadMermaid(content: string, format: 'svg' | 'png', viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        const timestamp = Date.now();
        const defaultFileName = `mermaid-diagram-${timestamp}.${format}`;
        
        const session = this.context.getChatSession(viewType || 'tab', windowId);
        const workdir = session.agent?.workingDirectory;
        
        const defaultUri = workdir 
            ? vscode.Uri.file(path.join(workdir, defaultFileName))
            : vscode.Uri.file(defaultFileName);

        const uri = await vscode.window.showSaveDialog({
            defaultUri: defaultUri,
            filters: format === 'svg' ? { 'SVG': ['svg'] } : { 'PNG': ['png'] }
        });

        if (uri) {
            try {
                let data: Uint8Array;
                if (format === 'svg') {
                    data = Buffer.from(content, 'utf8');
                } else {
                    // content is a data URL: data:image/png;base64,...
                    const base64Data = content.split(',')[1];
                    data = Buffer.from(base64Data, 'base64');
                }
                await vscode.workspace.fs.writeFile(uri, data);
                vscode.window.showInformationMessage(`图表已保存至: ${uri.fsPath}`);
            } catch (error) {
                console.error('保存图表失败:', error);
                vscode.window.showErrorMessage(`保存图表失败: ${error}`);
            }
        }
    }

    private async sendMessageToAgent(text: string, images?: Array<{ data: string; mediaType: string; }>, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        const session = this.context.getChatSession(viewType || 'tab', windowId);
        try {
            await session.sendMessage(text, images);
        } catch (error) {
            console.error(`发送消息给 ${viewType} 智能体时出错:`, error);
            vscode.window.showErrorMessage('发送消息失败: ' + error);
        }
    }

    private async abortMessage(viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        const session = this.context.getChatSession(viewType || 'tab', windowId);
        session.abortMessage();
    }

    private async clearChat(viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        const session = this.context.getChatSession(viewType || 'tab', windowId);
        try {
            await session.clearChat();
        } catch (error) {
            console.error(`清除 ${viewType} 聊天会话失败:`, error);
            vscode.window.showErrorMessage('清除聊天失败: ' + error);
        }
    }

    private async restoreSession(sessionId: string, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        if (!sessionId) return;
        const session = this.context.getChatSession(viewType || 'tab', windowId);
        try {
            await session.restoreSession(sessionId);
        } catch (error) {
            console.error(`恢复 ${viewType} 会话失败:`, error);
            vscode.window.showErrorMessage('恢复会话失败: ' + error);
            this.context.postMessage({
                command: 'sessionsError',
                error: '恢复会话失败: ' + error
            }, viewType, windowId);
        }
    }

    private async handleFileSuggestionsRequest(filterText: string, requestId: string, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        try {
            const files = await this.fileService.findWorkspaceFiles(filterText);
            this.context.postMessage({
                command: 'fileSuggestionsResponse',
                suggestions: files,
                filterText: filterText,
                requestId: requestId
            }, viewType, windowId);
        } catch (error) {
            console.error(`获取 ${viewType} 文件建议失败:`, error);
            this.context.postMessage({
                command: 'fileSuggestionsError',
                error: '获取文件建议失败: ' + error,
                requestId: requestId
            }, viewType, windowId);
        }
    }

    private async handleUploadFilesToArtifacts(files: any[], viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        try {
            const { uploadedFiles, errors } = await this.fileService.uploadFilesToArtifacts(files);
            if (uploadedFiles.length > 0) {
                this.context.postMessage({
                    command: 'uploadSuccess',
                    uploadedFiles: uploadedFiles,
                    message: `成功上传 ${uploadedFiles.length} 个文件到临时目录`
                }, viewType, windowId);
                vscode.window.showInformationMessage(`成功上传 ${uploadedFiles.length} 个文件到临时目录`);
            }
            if (errors.length > 0) {
                this.context.postMessage({
                    command: 'uploadError',
                    errors: errors,
                    message: `部分文件上传失败: ${errors.length} 个错误`
                }, viewType, windowId);
                vscode.window.showErrorMessage(`部分文件上传失败: ${errors.length} 个错误`);
            }
        } catch (error) {
            console.error(`文件上传处理失败:`, error);
            this.context.postMessage({
                command: 'uploadError',
                error: '文件上传处理失败: ' + error,
            }, viewType, windowId);
        }
    }

    private async handleConfirmationResponse(confirmationId: string, approved: boolean, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        const session = this.context.getChatSession(viewType || 'tab', windowId);
        const pending = session.pendingConfirmations.get(confirmationId);
        if (!pending) {
            console.warn(`收到 ${viewType} 未知确认响应:`, confirmationId);
            return;
        }
        session.pendingConfirmations.delete(confirmationId);
        if (approved) {
            pending.resolve({ behavior: 'allow' });
        } else {
            pending.resolve({ behavior: 'deny', message: '用户拒绝了操作' });
            session.abortMessage();
        }
    }

    private async handleGetConfiguration(viewType?: 'sidebar' | 'tab' | 'window', windowId?: string): Promise<void> {
        try {
            const config = await this.configService.loadConfiguration();
            this.context.postMessage({
                command: 'configurationResponse',
                configurationData: config
            }, viewType, windowId);
        } catch (error) {
            console.error(`Failed to get ${viewType} configuration:`, error);
            this.context.postMessage({
                command: 'configurationError',
                error: 'Failed to load configuration: ' + error
            }, viewType, windowId);
        }
    }

    private async handleUpdateConfiguration(configData: any, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string): Promise<void> {
        try {
            await this.configService.saveConfiguration(configData);
            const config = await this.configService.loadConfiguration();
            
            this.context.updateAllSessionsConfig(config);

            this.context.postMessage({ command: 'configurationUpdated' }, viewType, windowId);
        } catch (error) {
            console.error(`Failed to update ${viewType} configuration:`, error);
            this.context.postMessage({
                command: 'configurationError',
                error: 'Failed to save configuration: ' + error
            }, viewType, windowId);
        }
    }

    private async handleWebviewReady(viewType?: 'sidebar' | 'tab' | 'window', windowId?: string): Promise<void> {
        const session = this.context.getChatSession(viewType || 'tab', windowId);
        if (!session.agent) {
            await this.context.initializeAgent(viewType || 'tab', windowId);
        }
        const configurationData = await this.configService.loadConfiguration();
        const sessions = await this.sessionService.getSessionsList();
        const pendingConfirmations = Array.from(session.pendingConfirmations.entries()).map(([confirmationId, pending]) => ({
            confirmationId,
            toolName: pending.toolName,
            confirmationType: pending.confirmationType,
            toolInput: pending.toolInput
        }));
        this.context.postMessage({
            command: 'setInitialState',
            messages: session.messages,
            isStreaming: session.isStreaming,
            sessions: sessions,
            session: session.sessionId && session.agent ? {
                id: session.sessionId,
                sessionType: 'main',
                workdir: session.agent.workingDirectory,
                lastActiveAt: new Date(),
                latestTotalTokens: session.agent.latestTotalTokens
            } : undefined,
            configurationData,
            pendingConfirmations
        }, viewType, windowId);
    }

    private async handleSlashCommandsRequest(filterText: string, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        const session = this.context.getChatSession(viewType || 'tab', windowId);
        try {
            const allCommands = session.getSlashCommands();
            let filteredCommands = allCommands;
            if (filterText && filterText.trim().length > 0) {
                const filter = filterText.toLowerCase();
                filteredCommands = allCommands.filter(command =>
                    command.id.toLowerCase().includes(filter) ||
                    command.name.toLowerCase().includes(filter)
                );
            }
            const commands = filteredCommands.map(command => ({
                id: command.id,
                name: command.name,
                description: command.description
            }));
            this.context.postMessage({
                command: 'slashCommandsResponse',
                commands: commands
            }, viewType, windowId);
        } catch (error) {
            console.error(`获取 ${viewType} 指令失败:`, error);
            this.context.postMessage({
                command: 'slashCommandsError',
                error: '获取指令失败: ' + error
            }, viewType, windowId);
        }
    }

    private async handleGetKbItems(level: string, kbId: string | number | undefined, folderId: string | number | undefined, backendLink: string, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        try {
            const result = await this.kbService.getKbItems(level, kbId, folderId, backendLink);
            this.context.postMessage({
                command: 'kbItemsResponse',
                level,
                kbId,
                folderId,
                result
            }, viewType, windowId);
        } catch (error) {
            console.error('[KnowledgeBase] 获取数据失败:', error);
            this.context.postMessage({
                command: 'kbItemsError',
                error: '获取知识库数据失败: ' + (error instanceof Error ? error.message : String(error))
            }, viewType, windowId);
        }
    }

    private async handleDownloadKbFile(fileId: string | number, fileName: string, backendLink: string, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        try {
            const finalPath = await this.kbService.downloadKbFile(fileId, fileName, backendLink);
            this.context.postMessage({
                command: 'kbFileDownloaded',
                tempPath: finalPath
            }, viewType, windowId);
        } catch (error) {
            console.error('[KnowledgeBase] 下载知识库文件失败:', error);
            vscode.window.showErrorMessage('下载知识库文件失败: ' + (error instanceof Error ? error.message : String(error)));
            this.context.postMessage({
                command: 'kbFileDownloadError',
                error: '下载失败: ' + (error instanceof Error ? error.message : String(error))
            }, viewType, windowId);
        }
    }
}
