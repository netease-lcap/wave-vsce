import * as vscode from 'vscode';
import {
    PluginCore,
    Scope
} from 'wave-agent-sdk';

const DEFAULT_PLUGINS = ['settings@wave-plugins-official'];

interface PluginInfo {
    id: string;
    installed: boolean;
}

/**
 * Pure helper: returns plugin IDs that are not yet installed.
 */
export function getMissingDefaultPlugins(
    installedPlugins: PluginInfo[],
    defaultPlugins: string[] = DEFAULT_PLUGINS
): string[] {
    return defaultPlugins.filter(
        id => !installedPlugins.some(p => p.id === id && p.installed)
    );
}

export class PluginService {
    private pluginCore: PluginCore;

    constructor() {
        this.pluginCore = new PluginCore(this.getWorkdir());
    }

    private getWorkdir(): string | undefined {
        return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    }

    public async listPlugins() {
        const { plugins } = await this.pluginCore.listPlugins();
        const mergedEnabled = this.pluginCore.getMergedEnabledPlugins();

        return plugins.map((p) => {
            const pluginId = `${p.name}@${p.marketplace}`;
            return {
                id: pluginId,
                name: p.name,
                description: p.description,
                marketplace: p.marketplace,
                installed: p.installed,
                version: p.version,
                enabled: mergedEnabled[pluginId] !== false,
                scope: p.scope
            };
        });
    }

    public async installPlugin(pluginId: string, scope?: Scope) {
        return await this.pluginCore.installPlugin(pluginId, scope);
    }

    public async uninstallPlugin(pluginId: string) {
        await this.pluginCore.uninstallPlugin(pluginId);
    }

    public async enablePlugin(pluginId: string, scope?: Scope) {
        await this.pluginCore.enablePlugin(pluginId, scope);
    }

    public async disablePlugin(pluginId: string, scope?: Scope) {
        await this.pluginCore.disablePlugin(pluginId, scope);
    }

    public async updatePlugin(pluginId: string) {
        return await this.pluginCore.updatePlugin(pluginId);
    }

    public async listMarketplaces() {
        return await this.pluginCore.listMarketplaces();
    }

    public async addMarketplace(input: string) {
        return await this.pluginCore.addMarketplace(input);
    }

    public async removeMarketplace(name: string) {
        return await this.pluginCore.removeMarketplace(name);
    }

    public async updateMarketplace(name?: string) {
        return await this.pluginCore.updateMarketplace(name);
    }

    /**
     * Automatically install default plugins that are not yet installed.
     * Silently swallows errors to avoid blocking extension startup.
     */
    public async ensureDefaultPluginsInstalled(): Promise<void> {
        try {
            const plugins = await this.listPlugins();
            const missing = getMissingDefaultPlugins(plugins);
            for (const pluginId of missing) {
                await this.installPlugin(pluginId, 'user');
                console.log(`自动安装插件成功: ${pluginId}`);
            }
        } catch (error) {
            console.warn(`自动安装默认插件失败: ${error}`);
        }
    }
}
