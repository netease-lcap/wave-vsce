import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { 
    MarketplaceService, 
    ConfigurationService as SdkConfigurationService, 
    PluginManager, 
    PluginScopeManager, 
    Scope 
} from 'wave-agent-sdk';

export class PluginService {
    private marketplaceService: MarketplaceService;
    private sdkConfigService: SdkConfigurationService;

    constructor() {
        this.marketplaceService = new MarketplaceService();
        this.sdkConfigService = new SdkConfigurationService();
    }

    /**
     * Get icon for a plugin. Returns base64 data URL or undefined if no icon exists.
     */
    private getPluginIcon(pluginName: string, marketplacePath: string): string | undefined {
        // Try to read icon file from plugin directory
        const pluginPath = path.join(marketplacePath, 'plugins', pluginName, '.wave-plugin');
        const iconExtensions = ['icon.svg', 'icon.png', 'icon.jpg', 'icon.gif'];
        
        for (const iconFile of iconExtensions) {
            const iconPath = path.join(pluginPath, iconFile);
            if (fs.existsSync(iconPath)) {
                try {
                    const iconData = fs.readFileSync(iconPath);
                    const mimeType = iconFile.endsWith('.svg') ? 'image/svg+xml' : 
                                    iconFile.endsWith('.png') ? 'image/png' : 
                                    iconFile.endsWith('.jpg') ? 'image/jpeg' : 'image/gif';
                    return `data:${mimeType};base64,${iconData.toString('base64')}`;
                } catch (error) {
                    console.warn(`Failed to read icon for ${pluginName}:`, error);
                }
            }
        }
        
        // No icon found, return undefined
        return undefined;
    }

    private getWorkdir(): string | undefined {
        return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    }

    public async listPlugins() {
        const workdir = this.getWorkdir();
        const installedPlugins = await this.marketplaceService.getInstalledPlugins();
        const marketplaces = await this.marketplaceService.listMarketplaces();
        const mergedEnabled = workdir ? this.sdkConfigService.getMergedEnabledPlugins(workdir) : {};

        // Create scope manager for detecting plugin scopes
        let scopeManager: PluginScopeManager | undefined;
        if (workdir) {
            const pluginManager = new PluginManager({ workdir });
            scopeManager = new PluginScopeManager({
                workdir,
                configurationService: this.sdkConfigService,
                pluginManager,
            });
        }

        console.debug(`[PluginService] Found ${marketplaces.length} marketplaces:`, marketplaces.map(m => m.name));
        const allPlugins: any[] = [];

        for (const m of marketplaces) {
            const mPath = this.marketplaceService.getMarketplacePath(m);
            console.debug(`[PluginService] Loading marketplace "${m.name}" from path: ${mPath}`);
            try {
                const manifest = await this.marketplaceService.loadMarketplaceManifest(mPath);
                console.debug(`[PluginService] Marketplace "${m.name}" manifest loaded, found ${manifest.plugins?.length || 0} plugins`);
                manifest.plugins.forEach((p) => {
                    const installed = installedPlugins.plugins.find(
                        (ip) => ip.name === p.name && ip.marketplace === m.name
                    );
                    const pluginId = `${p.name}@${m.name}`;
                    
                    // Detect scope for installed plugins
                    let scope: Scope | undefined;
                    if (installed && scopeManager) {
                        scope = scopeManager.findPluginScope(pluginId) || undefined;
                    }
                    
                    // Get plugin icon
                    const icon = this.getPluginIcon(p.name, mPath);
                    
                    allPlugins.push({
                        id: pluginId,
                        name: p.name,
                        description: p.description,
                        marketplace: m.name,
                        installed: !!installed,
                        version: installed?.version,
                        enabled: mergedEnabled[pluginId] !== false,
                        scope: scope,
                        icon: icon
                    });
                });
            } catch (e) {
                console.error(`Failed to load marketplace ${m.name}:`, e);
            }
        }
        return allPlugins;
    }

    public async installPlugin(pluginId: string, scope?: Scope) {
        const workdir = this.getWorkdir();
        const installed = await this.marketplaceService.installPlugin(pluginId);
        
        if (scope && workdir) {
            const pluginManager = new PluginManager({ workdir });
            const scopeManager = new PluginScopeManager({
                workdir,
                configurationService: this.sdkConfigService,
                pluginManager,
            });
            const fullPluginId = `${installed.name}@${installed.marketplace}`;
            await scopeManager.enablePlugin(scope, fullPluginId);
        }
        return installed;
    }

    public async uninstallPlugin(pluginId: string) {
        const workdir = this.getWorkdir();
        
        // Uninstall the plugin from the marketplace
        await this.marketplaceService.uninstallPlugin(pluginId);
        
        // Clean up plugin configuration from all scopes
        if (workdir) {
            try {
                const pluginManager = new PluginManager({ workdir });
                const scopeManager = new PluginScopeManager({
                    workdir,
                    configurationService: this.sdkConfigService,
                    pluginManager,
                });
                await scopeManager.removePluginFromAllScopes(pluginId);
            } catch (error) {
                console.warn(`Warning: Could not clean up all plugin configurations: ${error}`);
            }
        }
    }

    public async enablePlugin(pluginId: string, scope?: Scope) {
        const workdir = this.getWorkdir();
        if (!workdir) throw new Error('No workspace folder open');
        
        const pluginManager = new PluginManager({ workdir });
        const scopeManager = new PluginScopeManager({
            workdir,
            configurationService: this.sdkConfigService,
            pluginManager,
        });
        
        // If scope is not provided, find the scope where the plugin is installed
        const resolvedScope = scope || scopeManager.findPluginScope(pluginId) || 'user';
        await scopeManager.enablePlugin(resolvedScope, pluginId);
    }

    public async disablePlugin(pluginId: string, scope?: Scope) {
        const workdir = this.getWorkdir();
        if (!workdir) throw new Error('No workspace folder open');
        
        const pluginManager = new PluginManager({ workdir });
        const scopeManager = new PluginScopeManager({
            workdir,
            configurationService: this.sdkConfigService,
            pluginManager,
        });
        
        // If scope is not provided, find the scope where the plugin is installed
        const resolvedScope = scope || scopeManager.findPluginScope(pluginId) || 'user';
        await scopeManager.disablePlugin(resolvedScope, pluginId);
    }

    public async listMarketplaces() {
        return await this.marketplaceService.listMarketplaces();
    }

    public async addMarketplace(input: string) {
        return await this.marketplaceService.addMarketplace(input);
    }

    public async removeMarketplace(name: string) {
        return await this.marketplaceService.removeMarketplace(name);
    }

    public async updateMarketplace(name?: string) {
        return await this.marketplaceService.updateMarketplace(name);
    }
}
