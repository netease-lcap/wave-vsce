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

        // Read the compiled React bundle
        const jsContent = fs.readFileSync(chatJsPath, 'utf-8');

        // Create a minimal HTML page that matches the React app structure
        const testHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wave AI Chat</title>
</head>
<body>
    <div id="root"></div>
    <script>
        ${mockVscodeApiJs}
    </script>
    <script>
        try {
            ${jsContent}
        } catch (error) {
            console.error('Error loading React app:', error);
        }
    </script>
</body>
</html>`;

        // Load the HTML content
        await page.setContent(testHtml);

        // Wait for the React app to render
        await page.waitForTimeout(1000);

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