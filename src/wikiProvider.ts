import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { WebviewManager } from './session/webviewManager';
import { Agent, AgentCallbacks, Message, Task } from 'wave-agent-sdk';
import { ConfigurationService } from './services/configurationService';
import { VscodeLspAdapter } from './services/lspAdapter';

export class WikiProvider {
    public static readonly viewType = 'waveWiki';
    private webviewManager: WebviewManager;
    private context: vscode.ExtensionContext;
    private wikiWatcher: vscode.FileSystemWatcher | undefined;
    private agent: Agent | undefined;
    private configService: ConfigurationService;
    private tasks: Task[] = [];

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.configService = new ConfigurationService(context);
        this.webviewManager = new WebviewManager(context, {
            onMessage: async (message) => {
                await this.handleMessage(message);
            },
            onTabDispose: () => {},
            onWindowDispose: () => {}
        });

        this.setupWikiWatcher();
    }

    public async createOrShowWikiPanel(mode: 'tab' | 'window' = 'tab') {
        if (mode === 'window') {
            const windowId = `wiki_window_${Date.now()}`;
            this.webviewManager.createWindowPanel(WikiProvider.viewType, 'WaveWiki', windowId, 'wiki');
            await vscode.commands.executeCommand('workbench.action.moveEditorToNewWindow');
        } else {
            const tabPanel = this.webviewManager.getTabPanel();
            if (tabPanel) {
                tabPanel.reveal();
            } else {
                this.webviewManager.createTabPanel(WikiProvider.viewType, 'WaveWiki', vscode.ViewColumn.One, 'wiki');
            }
        }
        this.refreshWikiTree();
    }

    private async initializeAgent() {
        if (this.agent) return;

        try {
            const config = await this.configService.loadConfiguration();
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            const workdir = workspaceFolder?.uri.fsPath;

            const agentCallbacks: AgentCallbacks = {
                onMessagesChange: (messages: Message[]) => {
                    let shouldRefresh = false;
                    messages.forEach(msg => {
                        msg.blocks.forEach(block => {
                            if (block.type === 'tool' && block.stage === 'end' && (block.name === 'edit' || block.name === 'write')) {
                                // If the file is in the docs directory, refresh the tree
                                const filePath = (block as any).parameters ? JSON.parse((block as any).parameters).file_path : undefined;
                                if (filePath && (filePath.includes('/docs/') || filePath.startsWith('docs/'))) {
                                    shouldRefresh = true;
                                }
                            }
                        });
                    });
                    if (shouldRefresh) {
                        this.refreshWikiTree();
                    }
                },
                onTasksChange: (tasks: Task[]) => {
                    this.tasks = tasks;
                }
            };

            this.agent = await Agent.create({
                logger: this.context.extensionMode === vscode.ExtensionMode.Development ? console : undefined,
                callbacks: agentCallbacks,
                workdir,
                apiKey: config.apiKey || undefined,
                defaultHeaders: this.parseHeaders(config.headers),
                baseURL: config.baseURL || undefined,
                model: config.agentModel,
                fastModel: config.fastModel,
                language: config.language,
                lspManager: new VscodeLspAdapter(),
                permissionMode: 'bypassPermissions'
            });
        } catch (error) {
            console.error('初始化 Wiki 智能体失败:', error);
            throw error;
        }
    }

    private parseHeaders(headersStr?: string): Record<string, string> | undefined {
        if (!headersStr || !headersStr.trim()) return undefined;
        try {
            return JSON.parse(headersStr);
        } catch (e) {
            return undefined;
        }
    }

    private setupWikiWatcher() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
            const wikiDirPath = path.join(workspaceFolders[0].uri.fsPath, 'docs');
            // Watch all files in the docs directory
            this.wikiWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(wikiDirPath, '**/*'));
            this.wikiWatcher.onDidChange(() => this.refreshWikiTree());
            this.wikiWatcher.onDidCreate(() => this.refreshWikiTree());
            this.wikiWatcher.onDidDelete(() => this.refreshWikiTree());
        }
    }

    private async handleMessage(message: any) {
        switch (message.command) {
            case 'generateWiki':
                await this.generateWiki();
                break;
            case 'getWikiTree':
                await this.refreshWikiTree();
                break;
            case 'getPageContent':
                await this.getPageContent(message.path);
                break;
        }
    }

    private async generateWiki() {
        try {
            if (!this.agent) {
                await this.initializeAgent();
            }
            await this.agent!.sendMessage('/deep-docs:generate');
        } catch (error) {
            vscode.window.showErrorMessage('生成 Wiki 失败: ' + error);
        }
    }

    private async refreshWikiTree() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            console.log('[WikiProvider] No workspace folders found');
            return;
        }

        const wikiDirPath = path.join(workspaceFolders[0].uri.fsPath, 'docs');
        console.log(`[WikiProvider] Refreshing wiki tree from: ${wikiDirPath}`);
        try {
            if (fs.existsSync(wikiDirPath)) {
                const wikiTree = this.scanDirectory(wikiDirPath, wikiDirPath);
                console.log(`[WikiProvider] Scanned wiki tree, found ${wikiTree.length} top-level items`);
                this.webviewManager.postMessage({
                    command: 'updateWikiTree',
                    wikiTree: wikiTree.length > 0 ? wikiTree : null
                });
            } else {
                console.log(`[WikiProvider] Docs directory does not exist: ${wikiDirPath}`);
                this.webviewManager.postMessage({
                    command: 'updateWikiTree',
                    wikiTree: null
                });
            }
        } catch (error) {
            console.error('[WikiProvider] Error scanning docs directory:', error);
        }
    }

    private scanDirectory(dirPath: string, rootPath: string): any[] {
        const items: any[] = [];
        if (!fs.existsSync(dirPath)) return items;
        
        const files = fs.readdirSync(dirPath);
        console.log(`[WikiProvider] Scanning directory: ${dirPath}, files:`, files);

        for (const file of files) {
            const fullPath = path.join(dirPath, file);
            const relativePath = path.relative(rootPath, fullPath);
            const stats = fs.statSync(fullPath);

            if (stats.isDirectory()) {
                const children = this.scanDirectory(fullPath, rootPath);
                if (children.length > 0) {
                    items.push({
                        name: file,
                        path: relativePath,
                        type: 'directory',
                        children: children
                    });
                }
            } else if (file.endsWith('.md')) {
                items.push({
                    name: file.replace(/\.md$/, ''),
                    path: relativePath,
                    type: 'file'
                });
            }
        }

        // Sort: directories first, then files, both alphabetically
        return items.sort((a, b) => {
            if (a.type === b.type) {
                return a.name.localeCompare(b.name);
            }
            return a.type === 'directory' ? -1 : 1;
        });
    }

    private async getPageContent(filePath: string) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return;

        let fullPath = filePath;
        if (!path.isAbsolute(filePath)) {
            fullPath = path.join(workspaceFolders[0].uri.fsPath, 'docs', filePath);
        }

        try {
            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, 'utf-8');
                this.webviewManager.postMessage({
                    command: 'updatePageContent',
                    path: filePath,
                    content
                });
            }
        } catch (error) {
            console.error('读取页面内容失败:', error);
        }
    }

    public dispose() {
        if (this.wikiWatcher) {
            this.wikiWatcher.dispose();
        }
        this.webviewManager.dispose();
    }
}
