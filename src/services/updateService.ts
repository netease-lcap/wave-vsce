import * as vscode from 'vscode';

export interface UpdateInfo {
    latestVersion: string;
    currentVersion: string;
    downloadUrl: string;
    releaseNotes?: string;
}

interface ParsedVersion {
    major: number;
    minor: number;
    patch: number;
}

/**
 * Parse a semver string (e.g., "0.3.1" or "0.3.1-alpha.0") into components.
 * Returns null if the version string is invalid.
 */
export function parseVersion(version: string): ParsedVersion | null {
    // Strip pre-release suffix for comparison
    const core = version.replace(/^v?/, '').split('-')[0];
    const parts = core.split('.').map(Number);
    if (parts.length !== 3 || parts.some(p => Number.isNaN(p))) {
        return null;
    }
    return { major: parts[0], minor: parts[1], patch: parts[2] };
}

/**
 * Compare two parsed versions. Returns:
 *  -1 if a < b
 *   0 if a === b
 *   1 if a > b
 */
export function compareVersions(a: ParsedVersion, b: ParsedVersion): number {
    if (a.major !== b.major) return a.major < b.major ? -1 : 1;
    if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
    if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
    return 0;
}

/**
 * Check for updates by querying the GitHub Releases API.
 * Returns UpdateInfo if a newer version is available, or null otherwise.
 */
export async function checkForUpdate(currentVersion: string): Promise<UpdateInfo | null> {
    const current = parseVersion(currentVersion);
    if (!current) {
        console.warn('[UpdateService] Invalid current version:', currentVersion);
        return null;
    }

    try {
        const response = await fetch('https://api.github.com/repos/netease-lcap/wave-vsce/releases/latest', {
            headers: { 'Accept': 'application/vnd.github.v3+json' },
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
            console.warn('[UpdateService] GitHub API returned non-OK status:', response.status);
            return null;
        }

        const data = await response.json() as { tag_name: string; html_url: string; body?: string };
        const latestTag = data.tag_name.replace(/^v/, '');
        const latest = parseVersion(latestTag);

        if (!latest) {
            console.warn('[UpdateService] Invalid latest version from GitHub:', data.tag_name);
            return null;
        }

        if (compareVersions(latest, current) > 0) {
            return {
                latestVersion: latestTag,
                currentVersion: currentVersion,
                downloadUrl: data.html_url,
                releaseNotes: data.body
            };
        }

        return null;
    } catch (error) {
        console.warn('[UpdateService] Failed to check for updates:', error);
        return null;
    }
}

/**
 * Check for updates and show a native VS Code notification if a new version is available.
 * Uses globalState to cache: checks at most once per 24 hours, and dismisses ignored versions.
 */
export async function checkAndNotify(context: vscode.ExtensionContext): Promise<void> {
    const now = Date.now();
    const lastCheckTime = context.globalState.get<number>('wave.lastUpdateCheck', 0);
    const twentyFourHours = 24 * 60 * 60 * 1000;

    if (now - lastCheckTime < twentyFourHours) {
        return;
    }

    // Record check time immediately to avoid duplicate checks
    await context.globalState.update('wave.lastUpdateCheck', now);

    const ignoredVersion = context.globalState.get<string>('wave.ignoredVersion');
    const updateInfo = await checkForUpdate(context.extension.packageJSON.version);

    if (!updateInfo) {
        return;
    }

    // Skip if user previously ignored this version
    if (updateInfo.latestVersion === ignoredVersion) {
        return;
    }

    const message = `Wave 代码智聊 新版本 v${updateInfo.latestVersion} 已可用 (当前 v${updateInfo.currentVersion})`;

    vscode.window.showInformationMessage(message, '查看更新', '忽略').then(selection => {
        if (selection === '查看更新') {
            vscode.env.openExternal(vscode.Uri.parse(updateInfo.downloadUrl));
        } else if (selection === '忽略') {
            context.globalState.update('wave.ignoredVersion', updateInfo.latestVersion);
        }
    });
}
