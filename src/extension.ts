import * as vscode from 'vscode';
import { ChatProvider } from './chatProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('Wave AI Chat extension is now active!');

    // Register a simple test command
    const testCommand = vscode.commands.registerCommand('wave-chat.test', () => {
        vscode.window.showInformationMessage('Wave Chat Extension is working!');
    });

    // Register the main chat command
    const openChatCommand = vscode.commands.registerCommand('wave-chat.openChat', async () => {
        try {
            vscode.window.showInformationMessage('Opening Wave AI Chat...');
            const chatProvider = new ChatProvider(context);
            await chatProvider.createOrShowChatPanel();
        } catch (error) {
            console.error('Error opening chat:', error);
            vscode.window.showErrorMessage('Failed to open chat: ' + error);
        }
    });

    context.subscriptions.push(testCommand, openChatCommand);
    
    console.log('Wave Chat commands registered successfully');
    vscode.window.showInformationMessage('Wave AI Chat Extension activated!');
}

export function deactivate() {
    console.log('Wave AI Chat extension is deactivated');
}