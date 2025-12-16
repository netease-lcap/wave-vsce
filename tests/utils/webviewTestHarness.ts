import { test as base, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * Extended test context for webview testing
 */
type WebviewTestContext = {
    webviewPage: Page;
};

/**
 * Custom test fixture that loads the chat webview in isolation
 */
export const test = base.extend<WebviewTestContext>({
    webviewPage: async ({ page }, use) => {
        // Enable console logging for debugging
        page.on('console', (msg) => {
            console.log('Console:', msg.type(), msg.text());
        });

        // Enable error tracking
        page.on('pageerror', (error) => {
            console.error('Page error:', error);
        });

        // Load the React webview app for testing
        const chatJsPath = path.join(process.cwd(), 'webview', 'dist', 'chat.js');
        const webviewDistPath = path.join(process.cwd(), 'webview', 'dist');

        // Serve the webview files through a mock server that simulates vscode-webview:// protocol
        await page.route('vscode-webview://**', (route, request) => {
            const url = new URL(request.url());
            const pathname = url.pathname;
            
            // Remove leading slash and map to actual file
            const filename = pathname.substring(1);
            const filePath = path.join(webviewDistPath, filename);
            
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath);
                const ext = path.extname(filename);
                
                let contentType = 'application/octet-stream';
                if (ext === '.js') contentType = 'application/javascript';
                else if (ext === '.css') contentType = 'text/css';
                
                route.fulfill({
                    status: 200,
                    contentType,
                    body: content
                });
            } else {
                route.fulfill({
                    status: 404,
                    body: `File not found: ${filename}`
                });
            }
        });

        // Create a minimal HTML page that matches the React app structure
        const testHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wave AI Chat</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@vscode/codicons@latest/dist/codicon.css">
    <style>
        /* Global VS Code CSS Variables for Testing */
        :root {
            /* Dropdown and widget styling */
            --vscode-dropdown-background: #3c3c3c;
            --vscode-dropdown-border: #464647;
            --vscode-dropdown-listBackground: #383838;
            --vscode-widget-shadow: rgba(0, 0, 0, 0.36);

            /* List and selection colors */
            --vscode-list-hoverBackground: #2a2d2e;
            --vscode-list-activeSelectionBackground: #094771;
            --vscode-list-activeSelectionForeground: #ffffff;
            --vscode-list-inactiveSelectionBackground: #37373d;

            /* Input and editor colors */
            --vscode-input-background: #3c3c3c;
            --vscode-input-border: #464647;
            --vscode-input-foreground: #cccccc;
            --vscode-input-placeholderForeground: #858585;

            /* Editor colors */
            --vscode-editor-background: #1e1e1e;
            --vscode-editor-foreground: #d4d4d4;
            --vscode-editor-findMatchHighlightBackground: #ea5c004d;
            --vscode-editor-findMatchHighlightForeground: #ffffff;

            /* General colors */
            --vscode-foreground: #cccccc;
            --vscode-descriptionForeground: #9c9c9c;
            --vscode-icon-foreground: #cccccc;
            --vscode-panel-border: #464647;

            /* Button colors */
            --vscode-button-background: #0e639c;
            --vscode-button-foreground: #ffffff;
            --vscode-button-hoverBackground: #1177bb;

            /* Typography */
            --vscode-font-family: 'Segoe UI', system-ui, sans-serif;
            --vscode-font-size: 13px;
            --vscode-font-weight: 400;
        }

        /* Ensure body has proper styling */
        body {
            margin: 0;
            padding: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
        }

        #root {
            width: 100%;
            height: 100vh;
        }
    </style>
</head>
<body>
    <div id="root"></div>
    <script>
        ${mockVscodeApiJs}
    </script>
    <script src="vscode-webview://mock-extension-id/chat.js"></script>
</body>
</html>`;

        // Load the HTML content
        await page.setContent(testHtml);

        // Wait for the React app to render by checking for the chat container
        // This is much faster than a fixed timeout
        await page.waitForSelector('[data-testid="chat-container"]', { 
            timeout: 3000 
        });

        await use(page);
    }
});

/**
 * Mock VS Code API for testing
 */
const mockVscodeApiJs = `
    // Mock Node.js globals that React bundle expects
    window.process = {
        env: {
            NODE_ENV: 'production'
        }
    };
    
    // Mock VS Code API
    let messageHandlers = [];
    
    window.acquireVsCodeApi = () => ({
        postMessage: (message) => {
            
            // Store messages for test verification
            if (!window.testMessages) window.testMessages = [];
            window.testMessages.push(message);
            
            // Emit event for test listening
            window.dispatchEvent(new CustomEvent('vscode-message', { detail: message }));
        },
        setState: (state) => {
            // Mock setState
        },
        getState: () => {
            return {};
        }
    });

    // Helper to simulate messages from extension
    window.simulateExtensionMessage = (message) => {
        window.dispatchEvent(new MessageEvent('message', {
            data: message
        }));
    };

    // Helper to get messages sent to extension
    window.getTestMessages = () => {
        return window.testMessages || [];
    };

    // Helper to clear test messages
    window.clearTestMessages = () => {
        window.testMessages = [];
    };
`;

export { expect };