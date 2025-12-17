const path = require('path');
const fs = require('fs');

const testDir = __dirname;
console.log('测试目录:', testDir);

const expectedPath = path.join(__dirname, 'apps/vsce/webview/dist/chat.js');
console.log('期望路径:', expectedPath);
console.log('文件存在:', fs.existsSync(expectedPath));

const relativePath = path.join(__dirname, 'apps/vsce/webview/dist');
console.log('相对路径:', relativePath);
console.log('目录存在:', fs.existsSync(relativePath));
