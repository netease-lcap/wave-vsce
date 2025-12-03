#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🧪 Testing Wave VS Code Extension...\n');

// Test 1: Check extension structure
console.log('✅ 1. Checking extension structure...');
const requiredFiles = [
    'package.json',
    'tsconfig.json',
    'src/extension.ts',
    'src/chatProvider.ts',
    'webview/chat.html',
    'webview/chat.css',
    'webview/chat.js'
];

let structureOk = true;
for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(__dirname, file))) {
        console.error(`❌   Missing: ${file}`);
        structureOk = false;
    } else {
        console.log(`✅   Found: ${file}`);
    }
}

if (!structureOk) {
    console.error('\n❌ Extension structure is incomplete');
    process.exit(1);
}

// Test 2: Check package.json
console.log('\n✅ 2. Checking package.json manifest...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const requiredFields = ['name', 'version', 'engines', 'activationEvents', 'main', 'contributes'];
for (const field of requiredFields) {
    if (!packageJson[field]) {
        console.error(`❌   Missing field: ${field}`);
        process.exit(1);
    }
}

console.log('✅   All required manifest fields present');

// Test 3: Check wave-agent-sdk dependency
console.log('\n✅ 3. Checking wave-agent-sdk installation...');
try {
    const nodeModulesPath = path.join(__dirname, 'node_modules', 'wave-agent-sdk');
    if (!fs.existsSync(nodeModulesPath)) {
        console.error('❌   wave-agent-sdk not installed');
        process.exit(1);
    }
    
    const sdkPackage = JSON.parse(fs.readFileSync(path.join(nodeModulesPath, 'package.json'), 'utf8'));
    console.log(`✅   wave-agent-sdk v${sdkPackage.version} installed`);
} catch (error) {
    console.error('❌   Error checking wave-agent-sdk:', error.message);
    process.exit(1);
}

// Test 4: TypeScript compilation
console.log('\n✅ 4. Testing TypeScript compilation...');
const tscProcess = spawn('npx', ['tsc', '--noEmit'], { stdio: 'pipe', cwd: __dirname });

let tscOutput = '';
tscProcess.stdout.on('data', (data) => {
    tscOutput += data.toString();
});

tscProcess.stderr.on('data', (data) => {
    tscOutput += data.toString();
});

tscProcess.on('close', (code) => {
    if (code === 0) {
        console.log('✅   TypeScript compilation successful');
    } else {
        console.error('❌   TypeScript compilation failed:');
        console.error(tscOutput);
        process.exit(1);
    }

    // Test 5: Basic SDK integration
    console.log('\n✅ 5. Testing basic SDK integration...');
    try {
        const { Agent } = require('wave-agent-sdk');
        if (typeof Agent === 'undefined') {
            console.error('❌   Cannot import Agent from wave-agent-sdk');
            process.exit(1);
        }
        
        if (typeof Agent.create !== 'function') {
            console.error('❌   Agent.create is not a function');
            process.exit(1);
        }
        
        console.log('✅   Agent class imported successfully');
        console.log('✅   Agent.create method available');
    } catch (error) {
        console.error('❌   SDK integration error:', error.message);
        process.exit(1);
    }

    console.log('\n🎉 All tests passed! Extension is ready for use.');
    console.log('\n📝 Next steps:');
    console.log('   1. Press F5 to launch Extension Development Host');
    console.log('   2. Open a workspace in the new window');
    console.log('   3. Run "Wave Chat: Open Chat" from Command Palette');
});