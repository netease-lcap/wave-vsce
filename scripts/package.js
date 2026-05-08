const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function main() {
    const rootDir = path.join(__dirname, '..');
    const vendorDir = path.join(rootDir, 'vendor');
    const sdkVendorDir = path.join(rootDir, 'node_modules', 'wave-agent-sdk', 'vendor');
    
    // Ensure we are in the root directory
    process.chdir(rootDir);

    const args = process.argv.slice(2);
    const packageCurrent = args.includes('--current');
    
    // Run build first
    console.log('Running npm run esbuild:prod...');
    execSync('npm run esbuild:prod', { stdio: 'inherit' });
    
    const vsceArgs = packageCurrent ? '' : '--no-dependencies';

    // Copy vendor directory from wave-agent-sdk
    console.log(`\n=== Copying vendor directory from wave-agent-sdk ===`);
    if (fs.existsSync(vendorDir)) {
        fs.rmSync(vendorDir, { recursive: true, force: true });
    }
    
    if (fs.existsSync(sdkVendorDir)) {
        fs.cpSync(sdkVendorDir, vendorDir, { recursive: true });
        console.log('Copied vendor directory successfully.');
    } else {
        console.error('Error: wave-agent-sdk vendor directory not found!');
        process.exit(1);
    }

    // Ensure releases directory exists
    const releasesDir = path.join(rootDir, 'releases');
    if (!fs.existsSync(releasesDir)) {
        fs.mkdirSync(releasesDir, { recursive: true });
    }

    // Clean up old .vsix files in releases directory
    for (const f of fs.readdirSync(releasesDir)) {
        if (f.endsWith('.vsix')) {
            fs.unlinkSync(path.join(releasesDir, f));
            console.log(`Cleaned up old vsix: ${f}`);
        }
    }

    console.log(`\n=== Packaging extension ===`);
    const version = require('./../package.json').version;
    const vsixName = `wave-vscode-chat-${version}.vsix`;
    const vsixPath = path.join(releasesDir, vsixName);
    execSync(`npx vsce package --out ${vsixPath} ${vsceArgs}`, { stdio: 'inherit' });
    
    console.log(`\nCreated releases/${vsixName}`);
    console.log('\nAll targets processed successfully!');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
