# AGENTS.md

This file provides guidance to Wave Code when working with code in this repository.

## 开发命令 (Development Commands)

### 构建与编译 (Build and Compile)
- `npm run compile`: 编译后端 (TypeScript) 和前端 (Webpack)。
- `npm run compile:backend`: 仅编译 VS Code 扩展后端。
- `npm run compile:frontend`: 仅编译 React webview 前端。
- `npm run watch`: 同时运行后端 and 前端的监听器。

### 测试 (Testing)
- `npm test`: 运行 Playwright 端到端测试.
- `npm run test:demo`: 运行演示专用 Playwright 测试（用于生成截图和验证 UI）。
- `npm run test:demo -- tests/demo/your-test.demo.ts`: 运行单个演示测试。
- `npm run package`: 将扩展打包为 `.vsix` 文件。

## 高层架构 (High-Level Architecture)

本仓库是一个带有基于 React 的 webview 聊天界面的 VS Code 扩展。

### 后端 (Extension Host)
- **`src/extension.ts`**: 入口点。管理 `ChatProvider` 的生命周期。
- **`src/chatProvider.ts`**: 核心协调器。实现 `WebviewViewProvider` 并管理多个 `ChatSession` 实例（侧边栏、标签页和窗口模式）。
- **`src/session/chatSession.ts`**: 封装 `wave-agent-sdk`。处理智能体初始化、消息发送和配置更新。
- **`src/session/messageHandler.ts`**: 处理来自 webview 的消息并将其分发到相应的服务或会话。
- **`src/session/webviewManager.ts`**: 管理不同 webview 面板（侧边栏、标签页/窗口的 WebviewPanel）的创建和通信。
- **`src/services/`**: 包含配置、文件操作、会话持久化和插件管理的业务逻辑。
  - **`pluginService.ts`**: 插件管理服务，包括插件的安装、启用、禁用和市场管理。

### 前端 (Webview)
- **`webview/src/index.tsx`**: React 应用程序的入口点。
- **`webview/src/components/ChatApp.tsx`**: 使用 `useReducer` 模式管理聊天状态的主要组件。
- **`webview/src/components/ConfigurationDialog.tsx`**: 用于管理 AI 设置（API 密钥、模型、语言等）和插件管理的 UI。包含三个主要标签页：
  - **常规设置**: API 配置、模型选择、语言设置
  - **插件管理**: 探索新插件、已安装插件、插件市场
- **通信 (Communication)**: 使用 `vscode.postMessage` 和 `window.addEventListener('message', ...)` 与后端通信。
- **VS Code API 限制**: `acquireVsCodeApi()` 在整个 Webview 生命周期内只能被调用一次。必须在根组件（如 `index.tsx`）调用并作为 Prop 传递给子组件，严禁在子组件中重复获取，否则会导致 Webview 崩溃。

### 关键集成：`wave-agent-sdk`
该扩展严重依赖 `wave-agent-sdk` 来实现 AI 能力。智能体使用项目特定的工具（Bash、文件操作、LSP）进行初始化，并处理复杂的推理和工具执行逻辑。

## 测试策略 (Testing Strategy)
- **强制性 TDD**: 任何代码变更（包括 Bug 修复、新功能开发、重构等）都必须遵循测试驱动开发 (TDD) 方法。
- **必须编写测试**: 在提交任何更改之前，必须编写并验证相应的测试用例（如 Playwright E2E 测试）。
- **UI 验证**: 对于 UI 更改，使用 `tests/demo/` 编写 Playwright 脚本，模拟扩展消息并捕获截图，以便进行手动或自动验证。
- **LSP 探索**: 使用 `LSP` 工具探索第三方库（如 `wave-agent-sdk`），因为源代码可能不在 `src` 文件夹中。

## 文档 (Documentation)
- **`spec.html`**: 产品规格说明书。每当需求或 UI 功能发生变化时，必须更新此文件。
- **截图 (Screenshots)**: 位于 `screenshots/` 目录，用于在 `spec.html` 中记录 UI 的当前状态。截图文件不需要添加到 git。
