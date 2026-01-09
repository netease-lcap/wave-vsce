import * as vscode from 'vscode';

export interface ConfigurationData {
    authMethod?: 'apiKey' | 'headers';
    apiKey?: string;
    headers?: string;
    baseURL: string;
    agentModel: string;
    fastModel: string;
    backendLink: string;
}

export class ConfigurationService {
    constructor(private context: vscode.ExtensionContext) {}

    public async loadConfiguration(): Promise<ConfigurationData> {
        return {
            authMethod: this.context.globalState.get<'apiKey' | 'headers'>('authMethod') || 'apiKey',
            apiKey: this.context.globalState.get<string>('apiKey') || '',
            headers: this.context.globalState.get<string>('headers') || '',
            baseURL: this.context.globalState.get<string>('baseURL') || '',
            agentModel: this.context.globalState.get<string>('agentModel') || '',
            fastModel: this.context.globalState.get<string>('fastModel') || '',
            backendLink: this.context.globalState.get<string>('backendLink') || ''
        };
    }

    public async saveConfiguration(configData: Partial<ConfigurationData>): Promise<void> {
        try {
            if (configData.authMethod !== undefined) await this.context.globalState.update('authMethod', configData.authMethod);
            if (configData.apiKey !== undefined) await this.context.globalState.update('apiKey', configData.apiKey);
            if (configData.headers !== undefined) await this.context.globalState.update('headers', configData.headers);
            if (configData.baseURL !== undefined) await this.context.globalState.update('baseURL', configData.baseURL);
            if (configData.agentModel !== undefined) await this.context.globalState.update('agentModel', configData.agentModel);
            if (configData.fastModel !== undefined) await this.context.globalState.update('fastModel', configData.fastModel);
            if (configData.backendLink !== undefined) await this.context.globalState.update('backendLink', configData.backendLink);
        } catch (error) {
            console.error('Failed to save configuration:', error);
            throw error;
        }
    }
}
