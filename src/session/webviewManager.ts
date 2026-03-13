import * as vscode from 'vscode';
import * as path from 'path';

export interface WebviewManagerCallbacks {
    onMessage: (message: any, viewType: 'sidebar' | 'tab' | 'window', windowId?: string) => Promise<void>;
    onTabDispose: () => void;
    onWindowDispose: (windowId: string) => void;
}

export class WebviewManager {
    private sidebarView: vscode.WebviewView | undefined;
    private tabPanel: vscode.WebviewPanel | undefined;
    private windowPanels: Map<string, vscode.WebviewPanel> = new Map();
    private context: vscode.ExtensionContext;
    private callbacks: WebviewManagerCallbacks;

    private instanceId: string = Math.random().toString(36).substring(7);

    constructor(context: vscode.ExtensionContext, callbacks: WebviewManagerCallbacks) {
        this.context = context;
        this.callbacks = callbacks;
        console.log(`WebviewManager instance created: ${this.instanceId}`);
    }

    public setSidebarView(webviewView: vscode.WebviewView, contentType: string = 'chat') {
        console.log(`[${this.instanceId}] setSidebarView called with contentType: ${contentType}`);
        this.sidebarView = webviewView;
        this.setupWebview(webviewView.webview, 'sidebar', undefined, contentType);
    }

    public getSidebarView(): vscode.WebviewView | undefined {
        return this.sidebarView;
    }

    public createTabPanel(viewType: string, title: string, column: vscode.ViewColumn, contentType: string = 'chat'): vscode.WebviewPanel {
        this.tabPanel = vscode.window.createWebviewPanel(
            viewType,
            title,
            {
                viewColumn: column,
                preserveFocus: false
            },
            {
                enableScripts: true,
                localResourceRoots: [this.context.extensionUri],
                retainContextWhenHidden: true
            }
        );

        this.setupWebview(this.tabPanel.webview, 'tab', undefined, contentType);

        this.tabPanel.onDidDispose(() => {
            this.tabPanel = undefined;
            this.callbacks.onTabDispose();
        });

        return this.tabPanel;
    }

    public getTabPanel(): vscode.WebviewPanel | undefined {
        return this.tabPanel;
    }

    public createWindowPanel(viewType: string, title: string, windowId: string, contentType: string = 'chat'): vscode.WebviewPanel {
        const panel = vscode.window.createWebviewPanel(
            viewType,
            title,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [this.context.extensionUri],
                retainContextWhenHidden: true
            }
        );

        this.windowPanels.set(windowId, panel);
        this.setupWebview(panel.webview, 'window', windowId, contentType);

        panel.onDidDispose(() => {
            this.windowPanels.delete(windowId);
            this.callbacks.onWindowDispose(windowId);
        });

        return panel;
    }

    public getWindowPanel(windowId: string): vscode.WebviewPanel | undefined {
        return this.windowPanels.get(windowId);
    }

    public getAllWindowPanels(): Map<string, vscode.WebviewPanel> {
        return this.windowPanels;
    }

    private setupWebview(webview: vscode.Webview, viewType: 'sidebar' | 'tab' | 'window', windowId?: string, contentType: string = 'chat') {
        webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };

        webview.html = this.getWebviewContent(webview, contentType);

        webview.onDidReceiveMessage(async (message) => {
            await this.callbacks.onMessage(message, viewType, windowId);
        });
    }

    public postMessage(message: any, viewType?: 'sidebar' | 'tab' | 'window', windowId?: string) {
        if (viewType) {
            if (viewType === 'sidebar' && this.sidebarView) {
                this.sidebarView.webview.postMessage(message);
            } else if (viewType === 'tab' && this.tabPanel) {
                this.tabPanel.webview.postMessage(message);
            } else if (viewType === 'window' && windowId) {
                const panel = this.windowPanels.get(windowId);
                if (panel) {
                    panel.webview.postMessage(message);
                }
            }
            return;
        }

        // Broadcast
        if (this.sidebarView) {
            this.sidebarView.webview.postMessage(message);
        }
        if (this.tabPanel) {
            this.tabPanel.webview.postMessage(message);
        }
        this.windowPanels.forEach(panel => panel.webview.postMessage(message));
    }

    public getWebviewContent(webview: vscode.Webview, contentType: string = 'chat'): string {
        console.log(`[${this.instanceId}] Generating webview content for type: ${contentType}`);
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'webview', 'dist', 'chat.js')
        );

        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; connect-src ${webview.cspSource} data: blob:; img-src ${webview.cspSource} data: blob:; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource};">
    <title>Wave AI Chat</title>
    <script>
        window.WAVE_VIEW_TYPE = "${contentType}";
        console.log('[${this.instanceId}] Webview HTML: window.WAVE_VIEW_TYPE set to:', window.WAVE_VIEW_TYPE);
    </script>
</head>
<body>
    <div id="root"></div>
    <script src="${scriptUri}"></script>
</body>
</html>`;
    }

    public dispose() {
        if (this.tabPanel) {
            this.tabPanel.dispose();
        }
        this.windowPanels.forEach(panel => panel.dispose());
        this.windowPanels.clear();
    }
}
