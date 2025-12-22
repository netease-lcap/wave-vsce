import * as vscode from 'vscode';
import { listSessions, getFirstMessageContent, SessionMetadata } from 'wave-agent-sdk';

export interface ExtendedSessionMetadata extends SessionMetadata {
    firstMessageContent?: string | null;
}

export class SessionService {
    public async getSessionsList(): Promise<ExtendedSessionMetadata[]> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            const workdir = workspaceFolder?.uri.fsPath || process.cwd();

            const allSessions = await listSessions(workdir);
            
            // Slice to get only first 5 sessions
            const sessions = allSessions.slice(0, 5);
            
            // Add first message content to each session
            const sessionsWithContent = await Promise.all(
                sessions.map(async (session) => {
                    try {
                        const firstMessageContent = await getFirstMessageContent(session.id, workdir);
                        return {
                            ...session,
                            firstMessageContent: firstMessageContent || ''
                        };
                    } catch (error) {
                        console.warn(`Failed to get first message content for session ${session.id}:`, error);
                        return {
                            ...session,
                            firstMessageContent: ''
                        };
                    }
                })
            );

            return sessionsWithContent;
        } catch (error) {
            console.error(`获取会话列表失败:`, error);
            throw error;
        }
    }
}
