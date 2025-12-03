import * as vscode from 'vscode';
import { ChatProvider } from './chatProvider';

let chatProvider: ChatProvider | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('Wave AI 聊天扩展已激活！');

    // Create a single ChatProvider instance for the extension lifecycle
    chatProvider = new ChatProvider(context);

    // Register the main chat command
    const openChatCommand = vscode.commands.registerCommand('wave-chat.openChat', async () => {
        try {
            vscode.window.showInformationMessage('正在打开 Wave AI 聊天...');
            await chatProvider!.createOrShowChatPanel();
        } catch (error) {
            console.error('打开聊天时出错:', error);
            vscode.window.showErrorMessage('打开聊天失败: ' + error);
        }
    });

    context.subscriptions.push(openChatCommand);
    
    console.log('Wave 聊天命令注册成功');
    vscode.window.showInformationMessage('Wave AI 聊天扩展已激活！');
}

export async function deactivate() {
    console.log('Wave AI 聊天扩展正在停用');
    
    // Clean up the chat provider and its agent
    if (chatProvider) {
        await chatProvider.destroy();
        chatProvider = undefined;
    }
    
    console.log('Wave AI 聊天扩展已停用');
}