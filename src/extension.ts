import * as vscode from 'vscode';
import { ChatProvider } from './chatProvider';

let chatProvider: ChatProvider | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('Wave AI Chat extension is now active!');

    // Create a single ChatProvider instance for the extension lifecycle
    chatProvider = new ChatProvider(context);

    // Register the main chat command
    const openChatCommand = vscode.commands.registerCommand('wave-chat.openChat', async () => {
        try {
            vscode.window.showInformationMessage('Opening Wave AI Chat...');
            await chatProvider!.createOrShowChatPanel();
        } catch (error) {
            console.error('Error opening chat:', error);
            vscode.window.showErrorMessage('Failed to open chat: ' + error);
        }
    });

    context.subscriptions.push(openChatCommand);
    
    console.log('Wave Chat commands registered successfully');
    vscode.window.showInformationMessage('Wave AI Chat Extension activated!');
}

export async function deactivate() {
    console.log('Wave AI Chat extension is deactivating');
    
    // Clean up the chat provider and its agent
    if (chatProvider) {
        await chatProvider.destroy();
        chatProvider = undefined;
    }
    
    console.log('Wave AI Chat extension deactivated');
}