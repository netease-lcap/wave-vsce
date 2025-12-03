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
        // Load the chat.html file directly in the browser
        const chatHtmlPath = path.join(process.cwd(), 'webview', 'chat.html');
        const chatCssPath = path.join(process.cwd(), 'webview', 'chat.css');
        const chatJsPath = path.join(process.cwd(), 'webview', 'chat.js');

        // Read the HTML template and inject CSS/JS directly for testing
        const htmlContent = fs.readFileSync(chatHtmlPath, 'utf-8');
        const cssContent = fs.readFileSync(chatCssPath, 'utf-8');
        const jsContent = fs.readFileSync(chatJsPath, 'utf-8');

        // Create a complete HTML page for testing
        const testHtml = htmlContent
            .replace('{{STYLE_URI}}', 'data:text/css;base64,' + Buffer.from(cssContent).toString('base64'))
            .replace('{{SCRIPT_URI}}', 'data:text/javascript;base64,' + Buffer.from(mockVscodeApiJs + jsContent).toString('base64'));

        // Load the HTML content
        await page.setContent(testHtml);

        await use(page);
    }
});

/**
 * Mock VS Code API for testing
 */
const mockVscodeApiJs = `
    // Mock VS Code API
    let messageHandlers = [];
    
    window.acquireVsCodeApi = () => ({
        postMessage: (message) => {
            console.log('Mock VS Code API received:', message);
            
            // Store messages for test verification
            if (!window.testMessages) window.testMessages = [];
            window.testMessages.push(message);
            
            // Emit event for test listening
            window.dispatchEvent(new CustomEvent('vscode-message', { detail: message }));
        },
        setState: (state) => {
            console.log('Mock setState:', state);
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