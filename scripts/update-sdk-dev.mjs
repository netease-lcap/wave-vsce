import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VSCE_ROOT = path.join(__dirname, '..');
const TEMP_DIR = '/tmp/wave-agent-pack';
const SDK_REPO = 'https://github.com/netease-lcap/wave-agent.git';
const SDK_PACKAGE_NAME = 'wave-agent-sdk';
const DEV_VERSION = '0.0.0-dev';
const TGZ_NAME = `${SDK_PACKAGE_NAME}-${DEV_VERSION}.tgz`;

function run(cmd, opts = {}) {
    console.log(`\n> ${cmd}`);
    execSync(cmd, { stdio: 'inherit', ...opts });
}

async function main() {
    // 1. Clean up temp directory
    console.log('=== Step 1: Clean up temp directory ===');
    if (fs.existsSync(TEMP_DIR)) {
        fs.rmSync(TEMP_DIR, { recursive: true, force: true });
        console.log(`Removed ${TEMP_DIR}`);
    }

    // 2. Clone SDK repo
    console.log('\n=== Step 2: Clone SDK repo ===');
    run(`git clone --depth 1 ${SDK_REPO} ${TEMP_DIR}`);

    // 3. Install dependencies
    console.log('\n=== Step 3: Install dependencies ===');
    run('pnpm install', { cwd: TEMP_DIR });

    // 4. Set version to 0.0.0-dev
    console.log('\n=== Step 4: Set version to dev ===');
    const sdkPkgPath = path.join(TEMP_DIR, 'packages', 'agent-sdk', 'package.json');
    const sdkPkg = JSON.parse(fs.readFileSync(sdkPkgPath, 'utf-8'));
    sdkPkg.version = DEV_VERSION;
    fs.writeFileSync(sdkPkgPath, JSON.stringify(sdkPkg, null, 2) + '\n');
    console.log(`Set ${SDK_PACKAGE_NAME} version to ${DEV_VERSION}`);

    // 5. Build and pack SDK
    console.log('\n=== Step 5: Build & Pack SDK ===');
    const sdkDir = path.join(TEMP_DIR, 'packages', 'agent-sdk');
    run('pnpm run build', { cwd: sdkDir });
    run('pnpm pack', { cwd: sdkDir });

    // 6. Copy tgz to vsce root
    console.log('\n=== Step 6: Copy tgz to vsce root ===');
    const tgzSrc = path.join(sdkDir, TGZ_NAME);
    const tgzDest = path.join(VSCE_ROOT, TGZ_NAME);
    if (!fs.existsSync(tgzSrc)) {
        throw new Error(`tgz not found at ${tgzSrc}`);
    }
    fs.copyFileSync(tgzSrc, tgzDest);
    console.log(`Copied ${TGZ_NAME} to vsce root`);

    // 7. Update vsce package.json dependency
    console.log('\n=== Step 7: Update vsce package.json ===');
    const vscePkgPath = path.join(VSCE_ROOT, 'package.json');
    const vscePkg = JSON.parse(fs.readFileSync(vscePkgPath, 'utf-8'));
    vscePkg.dependencies[SDK_PACKAGE_NAME] = `file:./${TGZ_NAME}`;
    fs.writeFileSync(vscePkgPath, JSON.stringify(vscePkg, null, 2) + '\n');
    console.log(`Updated ${SDK_PACKAGE_NAME} to file:./${TGZ_NAME}`);

    // 8. Remove stale integrity hash from package-lock.json
    console.log('\n=== Step 8: Clean stale integrity hash ===');
    const lockPath = path.join(VSCE_ROOT, 'package-lock.json');
    if (fs.existsSync(lockPath)) {
        const lock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
        const sdkKey = `node_modules/${SDK_PACKAGE_NAME}`;
        if (lock.packages?.[sdkKey]) {
            delete lock.packages[sdkKey].integrity;
            console.log(`Removed integrity hash for ${sdkKey}`);
        }
        fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
    }

    // 9. npm install --force
    console.log('\n=== Step 9: npm install --force ===');
    run('npm install --force', { cwd: VSCE_ROOT });

    // 10. Clean up temp directory
    console.log('\n=== Step 10: Clean up temp directory ===');
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    console.log(`Removed ${TEMP_DIR}`);

    console.log('\n=== Done! ===');
    console.log(`SDK dev pack installed. Run "npm run compile" to verify.`);
}

main().catch(err => {
    console.error('\nError:', err.message);
    // Clean up temp dir on failure
    if (fs.existsSync(TEMP_DIR)) {
        console.log('Cleaning up temp directory...');
        fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    process.exit(1);
});
