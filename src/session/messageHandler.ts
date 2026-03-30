import * as vscode from 'vscode';
import * as path from 'path';
import { ChatSession } from './chatSession';
import { ConfigurationService } from '../services/configurationService';
import { FileService } from '../services/fileService';
import { SessionService } from '../services/sessionService';
import { PluginService } from '../services/pluginService';
import { SessionMetadata, PromptHistoryManager } from 'wave-agent-sdk';

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
    private sessionService: SessionService;
    private pluginService: PluginService;
    private context: MessageHandlerContext;

    constructor(
        configService: ConfigurationService,
        fileService: FileService,
        sessionService: SessionService,
        pluginService: PluginService,
        context: MessageHandlerContext
    ) {
        this.configService = configService;
        this.fileService = fileService;
        this.sessionService = sessionService;
        this.pluginService = pluginService;
        this.context = context;
    }

    public async handleMessage(message: any, viewType: 'sidebar' | 'tab' | 'window', windowId?: string) {
        switch (message.command) {
            case 'sendMessage':
                await this.sendMessageToAgent(message.text, message.images, message.force, viewType, windowId);
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
                await this.handleConfirmationResponse(message.confirmationId, message.approved, message.decision, viewType, windowId);
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
            case 'showError':
                vscode.window.showErrorMessage(message.message);
                break;
            case 'downloadMermaid':
                await this.handleDownloadMermaid(message.content, message.format, viewType, windowId);
                break;
            case 'webviewReady':
                await this.handleWebviewReady(viewType, windowId);
                break;
            case 'updateInputContent':
                this.handleUpdateInputContent(message.content, viewType, windowId);
                break;
            case 'setPermissionMode':
                await this.handleSetPermissionMode(message.mode, viewType, windowId);
                break;
            case 'deleteQueuedMessage':
                await this.handleDeleteQueuedMessage(message.index, viewType, windowId);
                break;
            case 'listPlugins':
                await this.handleListPlugins(viewType, windowId);
                break;
            case 'installPlugin':
                await this.handleInstallPlugin(message.pluginId, message.scope, viewType, windowId);
                break;
            case 'enablePlugin':
                await this.handleEnablePlugin(message.pluginId, message.scope, viewType, windowId);
                break;
            case 'disablePlugin':
                await this.handleDisablePlugin(message.pluginId, message.scope, viewType, windowId);
                break;
            case 'uninstallPlugin':
                await this.handleUninstallPlugin(message.pluginId, viewType, windowId);
                break;
            case 'updatePlugin':
                await this.handleUpdatePlugin(message.pluginId, viewType, windowId);
                break;
            case 'listMarketplaces':
                await this.handleListMarketplaces(viewType, windowId);
                break;
            case 'addMarketplace':
                await this.handleAddMarketplace(message.input, viewType, windowId);
                break;
            case 'removeMarketplace':
                await this.handleRemoveMarketplace(message.name, viewType, windowId);
                break;
            case 'updateMarketplace':
                await this.handleUpdateMarketplace(message.name, viewType, windowId);
                break;
            case 'openFile':
                await this.handleOpenFile(message.path, message.startLine, message.endLine);
                break;
            case 'previewImage':
                await this.handlePreviewImage(message.path);
                break;
            case 'rewindToMessage':
                await this.handleRewindToMessage(message.messageId, viewType, windowId);
                break;
            case 'requestHistory':
                await this.handleRequestHistory(viewType, windowId);
                break;
            case 'searchHistory':
                await this.handleSearchHistory(message.query, viewType, windowId);
                break;
        }
    }

    private async handleRequestHistory(viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        try {
            const history = await PromptHistoryManager.getHistory();
            this.context.postMessage({
                command: 'historyResponse',
                history: history
            }, viewType, windowId);
        } catch (error) {
            console.error(`获取 ${viewType} 历史记录失败:`, error);
            this.context.postMessage({
                command: 'historyError',
                error: '获取历史记录失败: ' + error
            }, viewType, windowId);
        }
    }

    private async handleSearchHistory(query: string, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        try {
            const history = await PromptHistoryManager.searchHistory(query);
            this.context.postMessage({
                command: 'historyResponse',
                history: history
            }, viewType, windowId);
        } catch (error) {
            console.error(`搜索 ${viewType} 历史记录失败:`, error);
            this.context.postMessage({
                command: 'historyError',
                error: '搜索历史记录失败: ' + error
            }, viewType, windowId);
        }
    }

    private async handleRewindToMessage(messageId: string, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        const session = this.context.getChatSession(viewType || 'tab', windowId);
        const result = await vscode.window.showWarningMessage(
            '确定要回滚到此消息吗？这将删除之后的所有消息并撤销相关的文件更改。',
            { modal: true },
            '确定'
        );
        
        if (result === '确定') {
            try {
                await session.rewindToMessage(messageId);
                // Notify frontend to update state (including inputContent)
                await this.handleWebviewReady(viewType, windowId);
                this.context.postMessage({ command: 'focusInput' }, viewType, windowId);
                this.context.postMessage({ command: 'scrollToBottom' }, viewType, windowId);
            } catch (error) {
                console.error(`回滚 ${viewType} 会话失败:`, error);
                vscode.window.showErrorMessage('回滚失败: ' + error);
            }
        }
    }

    private async handleOpenFile(filePath: string, startLine?: number, endLine?: number) {
        if (!filePath) return;
        
        try {
            const uri = vscode.Uri.file(filePath);
            const document = await vscode.workspace.openTextDocument(uri);
            const editor = await vscode.window.showTextDocument(document);
            
            if (startLine !== undefined) {
                const start = new vscode.Position(Math.max(0, startLine - 1), 0);
                const end = new vscode.Position(Math.max(0, (endLine || startLine) - 1), 0);
                editor.selection = new vscode.Selection(start, end);
                editor.revealRange(new vscode.Range(start, end), vscode.TextEditorRevealType.InCenter);
            }
        } catch (error) {
            console.error('打开文件失败:', error);
            vscode.window.showErrorMessage('打开文件失败: ' + error);
        }
    }

    private async handlePreviewImage(filePath: string) {
        if (!filePath) return;
        
        try {
            const uri = vscode.Uri.file(filePath);
            await vscode.commands.executeCommand('vscode.open', uri);
        } catch (error) {
            console.error('预览图片失败:', error);
            vscode.window.showErrorMessage('预览图片失败: ' + error);
        }
    }

    private async handleListPlugins(viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        try {
            const plugins = await this.pluginService.listPlugins();
            this.context.postMessage({ command: 'listPluginsResponse', plugins }, viewType, windowId);
        } catch (error) {
            vscode.window.showErrorMessage('获取插件列表失败: ' + error);
        }
    }

    private async handleInstallPlugin(pluginId: string, scope: any, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        try {
            await this.pluginService.installPlugin(pluginId, scope);
            vscode.window.showInformationMessage(`插件 ${pluginId} 安装成功`);
            await this.handleListPlugins(viewType, windowId);
            
            // Reload config and recreate agents to apply plugin changes
            const config = await this.configService.loadConfiguration();
            this.context.updateAllSessionsConfig(config);
        } catch (error) {
            vscode.window.showErrorMessage('安装插件失败: ' + error);
        }
    }

    private async handleEnablePlugin(pluginId: string, scope: any, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        try {
            await this.pluginService.enablePlugin(pluginId, scope);
            await this.handleListPlugins(viewType, windowId);
            
            // Reload config and recreate agents to apply plugin changes
            const config = await this.configService.loadConfiguration();
            this.context.updateAllSessionsConfig(config);
        } catch (error) {
            vscode.window.showErrorMessage('启用插件失败: ' + error);
        }
    }

    private async handleDisablePlugin(pluginId: string, scope: any, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        try {
            await this.pluginService.disablePlugin(pluginId, scope);
            await this.handleListPlugins(viewType, windowId);
            
            // Reload config and recreate agents to apply plugin changes
            const config = await this.configService.loadConfiguration();
            this.context.updateAllSessionsConfig(config);
        } catch (error) {
            vscode.window.showErrorMessage('禁用插件失败: ' + error);
        }
    }

    private async handleUninstallPlugin(pluginId: string, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        try {
            await this.pluginService.uninstallPlugin(pluginId);
            vscode.window.showInformationMessage('插件卸载成功');
            await this.handleListPlugins(viewType, windowId);
            
            // Reload config and recreate agents to apply plugin changes
            const config = await this.configService.loadConfiguration();
            this.context.updateAllSessionsConfig(config);
        } catch (error) {
            vscode.window.showErrorMessage('卸载插件失败: ' + error);
        }
    }

    private async handleUpdatePlugin(pluginId: string, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        try {
            await this.pluginService.updatePlugin(pluginId);
            vscode.window.showInformationMessage(`插件 ${pluginId} 更新成功`);
            await this.handleListPlugins(viewType, windowId);
            
            // Reload config and recreate agents to apply plugin changes
            const config = await this.configService.loadConfiguration();
            this.context.updateAllSessionsConfig(config);
        } catch (error) {
            vscode.window.showErrorMessage('更新插件失败: ' + error);
        }
    }

    private async handleListMarketplaces(viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        try {
            const marketplaces = await this.pluginService.listMarketplaces();
            this.context.postMessage({ command: 'listMarketplacesResponse', marketplaces }, viewType, windowId);
        } catch (error) {
            vscode.window.showErrorMessage('获取市场列表失败: ' + error);
        }
    }

    private async handleAddMarketplace(input: string, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        try {
            await this.pluginService.addMarketplace(input);
            vscode.window.showInformationMessage('市场添加成功');
            await this.handleListMarketplaces(viewType, windowId);
        } catch (error) {
            vscode.window.showErrorMessage('添加市场失败: ' + error);
        }
    }

    private async handleRemoveMarketplace(name: string, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        try {
            await this.pluginService.removeMarketplace(name);
            await this.handleListMarketplaces(viewType, windowId);
        } catch (error) {
            vscode.window.showErrorMessage('移除市场失败: ' + error);
        }
    }

    private async handleUpdateMarketplace(name?: string, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        try {
            await this.pluginService.updateMarketplace(name);
            vscode.window.showInformationMessage('市场更新成功');
            await this.handleListMarketplaces(viewType, windowId);
        } catch (error) {
            vscode.window.showErrorMessage('更新市场失败: ' + error);
        }
    }

    private async handleSetPermissionMode(mode: any, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        const session = this.context.getChatSession(viewType || 'tab', windowId);
        try {
            await session.setPermissionMode(mode);
        } catch (error) {
            console.error(`设置 ${viewType} 权限模式失败:`, error);
            vscode.window.showErrorMessage('设置权限模式失败: ' + error);
        }
    }

    private async handleDeleteQueuedMessage(index: number, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        const session = this.context.getChatSession(viewType || 'tab', windowId);
        session.deleteQueuedMessage(index);
    }

    private handleUpdateInputContent(content: string, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        const session = this.context.getChatSession(viewType || 'tab', windowId);
        session.inputContent = content;
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

    private async sendMessageToAgent(text: string, images?: Array<{ data: string; mediaType: string; }>, force?: boolean, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        const session = this.context.getChatSession(viewType || 'tab', windowId);
        try {
            await session.sendMessage(text, images, force);
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

    private async handleConfirmationResponse(confirmationId: string, approved: boolean, decision: any, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        const session = this.context.getChatSession(viewType || 'tab', windowId);
        const pending = session.pendingConfirmations.get(confirmationId);
        if (!pending) {
            console.warn(`收到 ${viewType} 未知确认响应:`, confirmationId);
            return;
        }
        session.pendingConfirmations.delete(confirmationId);
        if (approved) {
            if (decision) {
                pending.resolve(decision);
            } else {
                pending.resolve({ behavior: 'allow' });
            }
        } else {
            pending.resolve({ behavior: 'deny', message: '用户拒绝了操作' });
            session.abortMessage();
        }
        this.context.postMessage({ command: 'focusInput' }, viewType, windowId);
        this.context.postMessage({ command: 'scrollToBottom' }, viewType, windowId);
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
            this.context.postMessage({ command: 'focusInput' }, viewType, windowId);
            this.context.postMessage({ command: 'scrollToBottom' }, viewType, windowId);
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
            toolInput: pending.toolInput,
            suggestedPrefix: pending.suggestedPrefix
        }));

        this.context.postMessage({
            command: 'setInitialState',
            messages: session.messages,
            tasks: session.tasks,
            inputContent: session.inputContent,
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
            pendingConfirmations,
            permissionMode: session.agent?.getPermissionMode(),
            queuedMessages: session.messageQueue
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
}
