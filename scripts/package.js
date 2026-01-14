const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');

const RG_VERSION = 'v15.0.0';
const REPO = 'microsoft/ripgrep-prebuilt';

const TARGETS = [
    { vsceTarget: 'win32-x64', rgTarget: 'x86_64-pc-windows-msvc', ext: '.zip' },
    { vsceTarget: 'win32-arm64', rgTarget: 'aarch64-pc-windows-msvc', ext: '.zip' },
    { vsceTarget: 'darwin-x64', rgTarget: 'x86_64-apple-darwin', ext: '.tar.gz' },
    { vsceTarget: 'darwin-arm64', rgTarget: 'aarch64-apple-darwin', ext: '.tar.gz' },
    { vsceTarget: 'linux-x64', rgTarget: 'x86_64-unknown-linux-musl', ext: '.tar.gz' },
    { vsceTarget: 'linux-arm64', rgTarget: 'aarch64-unknown-linux-musl', ext: '.tar.gz' },
];

async function download(url, dest) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'vscode-ripgrep-builder' } }, (res) => {
            if (res.statusCode === 302 || res.statusCode === 301) {
                download(res.headers.location, dest).then(resolve).catch(reject);
            } else if (res.statusCode !== 200) {
                reject(new Error(`Failed to download from ${url}: ${res.statusCode}`));
            } else {
                const file = fs.createWriteStream(dest);
                res.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            }
        }).on('error', reject);
    });
}

async function main() {
    const rootDir = path.join(__dirname, '..');
    const binDir = path.join(rootDir, 'bin');
    
    // Ensure we are in the root directory
    process.chdir(rootDir);

    // Delete old vsix files
    console.log('Deleting old .vsix files...');
    fs.readdirSync(rootDir).forEach(file => {
        if (file.endsWith('.vsix')) {
            fs.rmSync(path.join(rootDir, file), { force: true });
        }
    });

    const args = process.argv.slice(2);
    const packageCurrent = args.includes('--current');
    const packageAll = args.includes('--all') || (!packageCurrent);

    let targetsToProcess = TARGETS;
    if (packageCurrent) {
        const currentTarget = `${os.platform()}-${os.arch()}`;
        targetsToProcess = TARGETS.filter(t => t.vsceTarget === currentTarget);
        if (targetsToProcess.length === 0) {
            console.error(`Current platform ${currentTarget} is not in the supported targets list.`);
            process.exit(1);
        }
    }

    // Run build first
    console.log('Running npm run webpack:prod...');
    execSync('npm run webpack:prod', { stdio: 'inherit' });
    
    const vsceArgs = packageCurrent ? '' : '--no-dependencies';

    // Ensure bin directory exists and is clean
    if (fs.existsSync(binDir)) {
        // Clean up everything except .gitkeep
        fs.readdirSync(binDir).forEach(file => {
            if (file !== '.gitkeep') {
                fs.rmSync(path.join(binDir, file), { recursive: true, force: true });
            }
        });
    } else {
        fs.mkdirSync(binDir);
    }

    for (const target of targetsToProcess) {
        console.log(`\n=== Downloading ripgrep for ${target.vsceTarget} ===`);
        
        const assetName = `ripgrep-${RG_VERSION}-${target.rgTarget}${target.ext}`;
        const url = `https://github.com/${REPO}/releases/download/${RG_VERSION}/${assetName}`;
        const downloadPath = path.join(os.tmpdir(), assetName);
        
        if (!fs.existsSync(downloadPath)) {
            console.log(`Downloading ${assetName}...`);
            await download(url, downloadPath);
        } else {
            console.log(`Using cached ${assetName}...`);
        }
        
        const tempExtractDir = path.join(os.tmpdir(), `rg-extract-${target.vsceTarget}`);
        if (fs.existsSync(tempExtractDir)) {
            fs.rmSync(tempExtractDir, { recursive: true, force: true });
        }
        fs.mkdirSync(tempExtractDir);

        console.log(`Extracting...`);
        if (target.ext === '.zip') {
            if (os.platform() === 'win32') {
                execSync(`powershell -Command "Expand-Archive -Path ${downloadPath} -DestinationPath ${tempExtractDir}"`);
            } else {
                execSync(`unzip -o ${downloadPath} -d ${tempExtractDir}`);
            }
        } else {
            execSync(`tar -xzf ${downloadPath} -C ${tempExtractDir}`);
        }
        
        const isWin = target.vsceTarget.startsWith('win32');
        const rgName = isWin ? 'rg.exe' : 'rg';
        const extractedRgPath = path.join(tempExtractDir, rgName);
        
        if (!fs.existsSync(extractedRgPath)) {
            throw new Error(`Failed to find rg in ${tempExtractDir}`);
        }
        
        const finalRgName = `rg-${target.vsceTarget}${isWin ? '.exe' : ''}`;
        const finalRgPath = path.join(binDir, finalRgName);
        fs.renameSync(extractedRgPath, finalRgPath);
        
        if (!isWin) {
            fs.chmodSync(finalRgPath, '755');
        }
        
        // Clean up temp extract dir
        fs.rmSync(tempExtractDir, { recursive: true, force: true });
    }

    console.log(`\n=== Packaging extension ===`);
    const version = require('./../package.json').version;
    const vsixName = `wave-vscode-chat-${version}.vsix`;
    execSync(`npx vsce package --out ${vsixName} ${vsceArgs}`, { stdio: 'inherit' });
    
    console.log(`\nCreated ${vsixName}`);
    console.log('\nAll targets processed successfully!');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
