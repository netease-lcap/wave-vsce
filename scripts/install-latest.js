const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const releasesDir = path.join(rootDir, 'releases');

if (!fs.existsSync(releasesDir)) {
    console.error('Error: releases/ directory not found. Run "npm run package" first.');
    process.exit(1);
}

const vsixFiles = fs.readdirSync(releasesDir).filter(f => f.endsWith('.vsix'));

if (vsixFiles.length === 0) {
    console.error('Error: No .vsix files found in releases/. Run "npm run package" first.');
    process.exit(1);
}

// Sort by semver descending to find the latest
function semverKey(v) {
    const parts = v.replace('wave-vscode-chat-', '').replace('.vsix', '').split('.');
    return parts.map(p => {
        const num = parseInt(p, 10);
        return isNaN(num) ? 0 : num;
    });
}

vsixFiles.sort((a, b) => {
    const ka = semverKey(a);
    const kb = semverKey(b);
    for (let i = 0; i < Math.max(ka.length, kb.length); i++) {
        if ((ka[i] || 0) > (kb[i] || 0)) return -1;
        if ((ka[i] || 0) < (kb[i] || 0)) return 1;
    }
    return 0;
});

const latest = vsixFiles[0];
const vsixPath = path.join(releasesDir, latest);

console.log(`Installing latest version: ${latest}`);
execSync(`code --install-extension "${vsixPath}"`, { stdio: 'inherit' });
