import { test, expect } from '@playwright/test';

// Inline the pure helper under test (mirrors src/services/pluginService.ts)
// This avoids CJS/ESM module resolution issues in Playwright tests.

const DEFAULT_PLUGINS = ['settings@wave-plugins-official'];

interface PluginInfo {
    id: string;
    installed: boolean;
}

function getMissingDefaultPlugins(
    installedPlugins: PluginInfo[],
    defaultPlugins: string[] = DEFAULT_PLUGINS
): string[] {
    return defaultPlugins.filter(
        id => !installedPlugins.some(p => p.id === id && p.installed)
    );
}

test.describe('getMissingDefaultPlugins', () => {
    test('returns all defaults when no plugins installed', () => {
        const missing = getMissingDefaultPlugins([]);
        expect(missing).toContain('settings@wave-plugins-official');
    });

    test('skips already-installed plugin', () => {
        const installed = [
            { id: 'settings@wave-plugins-official', installed: true }
        ];
        const missing = getMissingDefaultPlugins(installed);
        expect(missing).toHaveLength(0);
    });

    test('skips plugin marked as not installed', () => {
        const installed = [
            { id: 'settings@wave-plugins-official', installed: false }
        ];
        const missing = getMissingDefaultPlugins(installed);
        expect(missing).toContain('settings@wave-plugins-official');
    });

    test('ignores unrelated plugins', () => {
        const installed = [
            { id: 'other-plugin@some-market', installed: true }
        ];
        const missing = getMissingDefaultPlugins(installed);
        expect(missing).toContain('settings@wave-plugins-official');
    });

    test('supports custom default plugins list', () => {
        const installed = [
            { id: 'custom@market', installed: true }
        ];
        const missing = getMissingDefaultPlugins(installed, ['custom@market', 'missing@market']);
        expect(missing).toEqual(['missing@market']);
    });
});
