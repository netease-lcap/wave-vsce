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

    // Delete old vsix files
    console.log('Deleting old .vsix files...');
    fs.readdirSync(rootDir).forEach(file => {
        if (file.endsWith('.vsix')) {
            fs.rmSync(path.join(rootDir, file), { force: true });
        }
    });

    const args = process.argv.slice(2);
    const packageCurrent = args.includes('--current');
    
    // Run build first
    console.log('Running npm run webpack:prod...');
    execSync('npm run webpack:prod', { stdio: 'inherit' });
    
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
