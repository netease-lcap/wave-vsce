# Wave VS Code 插件本地构建和安装指南

## 📋 前置条件

1. **Node.js**: 确保安装了 Node.js (推荐 18.x 或更高版本)
2. **VS Code**: 安装 Visual Studio Code
3. **Git**: 用于克隆和管理代码

## 🔨 构建步骤

### 1. 安装依赖
```bash
npm install
```

### 2. 编译 TypeScript
```bash
# 一次性编译
npm run compile

# 或者启动监听模式（开发时推荐）
npm run watch
```

编译成功后，会在 `out/` 目录下生成 JavaScript 文件。

## 📦 安装和使用

### 方法一：开发模式（推荐用于开发调试）

1. **打开项目**：
   ```bash
   code /home/liuyiqi/code/wave-vsc
   ```

2. **启动调试**：
   - 按 `F5` 或 `Ctrl+Shift+D` 打开调试面板
   - 选择 "Run Extension" 或直接按 `F5`
   - 这会启动一个新的 VS Code 窗口，插件已经加载

3. **使用插件**：
   - 通过命令面板 (`Ctrl+Shift+P`) 搜索 "打开 AI 聊天"

### 方法二：打包安装 (.vsix)

如果你想在正常的 VS Code 中使用插件：

1. **安装 vsce 工具**：
   ```bash
   npm install -g @vscode/vsce
   ```

2. **打包插件**：
   ```bash
   vsce package
   ```
   这会生成一个 `.vsix` 文件，类似 `wave-vscode-chat-0.0.1.vsix`

3. **安装 .vsix 文件**：
   ```bash
   code --install-extension wave-vscode-chat-0.0.1.vsix
   ```
   
   或者在 VS Code 中：
   - 按 `Ctrl+Shift+P` 打开命令面板
   - 输入 "Extensions: Install from VSIX..."
   - 选择生成的 `.vsix` 文件

4. **重启 VS Code** 使插件生效

## 🎮 使用方法

### 启动聊天
- **命令面板**: 按 `Ctrl+Shift+P`，搜索 "打开 AI 聊天"

### 聊天功能
- 输入消息后按 `Enter` 发送
- 支持工具调用的实时状态显示
- 可以中止正在进行的对话 (Abort 按钮)
- 清除聊天历史功能

### 工作区分析
- 点击 "分析工作区" 按钮可以让 AI 分析当前项目

## 🛠️ 开发调试

### 监听模式
开发时建议使用监听模式，代码更改会自动重新编译：
```bash
npm run watch
```

### 重新加载插件
在调试模式的 VS Code 窗口中：
- 按 `Ctrl+R` (Windows/Linux) 或 `Cmd+R` (Mac) 重新加载插件

### 查看日志
- 打开 VS Code 开发者工具: `Help > Toggle Developer Tools`
- 查看 Console 面板获取详细日志

## 📁 项目结构

```
wave-vsc/
├── src/                    # TypeScript 源码
│   ├── extension.ts       # 插件入口
│   └── chatProvider.ts    # 聊天提供器
├── webview/               # 聊天界面
│   ├── chat.html         # HTML 模板
│   ├── chat.js           # 前端 JavaScript
│   └── chat.css          # 样式
├── out/                   # 编译输出目录
├── package.json           # 插件配置和依赖
└── tsconfig.json         # TypeScript 配置
```

## 🔧 配置

### Wave Agent SDK
插件使用 `wave-agent-sdk`，确保该依赖已正确安装：
```bash
npm list wave-agent-sdk
```

### VS Code 版本
最低支持 VS Code 1.74.0，在 `package.json` 中的 `engines.vscode` 字段定义。

## 🚀 快速开始

```bash
# 1. 克隆并进入项目目录
cd /home/liuyiqi/code/wave-vsc

# 2. 安装依赖
npm install

# 3. 编译代码
npm run compile

# 4. 启动开发模式
code . 
# 然后按 F5 启动调试
```

现在你就可以在新的 VS Code 窗口中使用 Wave AI 聊天插件了！

## ❓ 常见问题

### 编译错误
如果遇到编译错误，检查：
- Node.js 版本是否兼容
- 依赖是否正确安装 (`npm install`)
- TypeScript 配置是否正确

### 插件无法加载
- 确保编译成功 (`out/` 目录有生成文件)
- 检查 `package.json` 中的入口文件路径
- 重启 VS Code

### 功能异常
- 打开开发者工具查看控制台错误
- 检查 Wave Agent SDK 是否正常工作