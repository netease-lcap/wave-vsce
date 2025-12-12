# 聚焦功能说明

## 简单直接的解决方案

基于你的反馈，我们采用了最简单直接的方案：**新增一个专门的聚焦到输入框的命令**。

### 🎯 功能特性

#### 新增的聚焦命令
- **命令名**: `Wave: 聚焦到聊天输入框`
- **命令ID**: `wave-code.focusView`
- **快捷键**: `Ctrl+Shift+F` (Windows/Linux) 或 `Cmd+Shift+F` (Mac)

#### 智能聚焦逻辑
按优先级自动聚焦到合适的视图：

1. **窗口视图** (优先级最高)
   - 如果有独立聊天窗口，激活窗口并聚焦输入框

2. **标签页视图** (优先级中等)
   - 如果有标签页聊天，激活标签页并聚焦输入框

3. **侧边栏视图** (优先级较低)
   - 如果有侧边栏聊天，显示侧边栏并聚焦输入框

4. **自动创建** (兜底方案)
   - 如果没有任何聊天视图，自动创建标签页视图并聚焦输入框

### 🚀 使用方式

#### 方法 1: 键盘快捷键
- 按 `Ctrl+Shift+F` (Windows/Linux) 
- 按 `Cmd+Shift+F` (Mac)

#### 方法 2: 命令面板
1. 按 `Ctrl+Shift+P` 打开命令面板
2. 输入 "Wave: 聚焦到聊天输入框"
3. 按回车执行

### ✅ 功能优势

1. **简单直接**: 一个命令解决所有聚焦需求
2. **智能判断**: 自动选择最合适的视图进行聚焦
3. **全覆盖**: 支持所有视图类型（窗口、标签页、侧边栏）
4. **无冲突**: 独立的命令，不与任何内置功能冲突
5. **便捷快捷键**: `Ctrl+Shift+F` 易记易用

### 🔧 技术实现

#### ChatProvider.focusView() 方法
```typescript
public async focusView() {
    // 按优先级检查活动视图: 窗口 > 标签页 > 侧边栏
    
    // 1. 检查窗口视图
    if (this.windowPanels.size > 0) {
        const windowPanel = this.windowPanels.values().next().value;
        windowPanel.reveal(vscode.ViewColumn.Active);
        windowPanel.webview.postMessage({ command: 'focusInput' });
        return;
    }

    // 2. 检查标签页视图
    if (this.panel) {
        this.panel.reveal(vscode.ViewColumn.Active);
        this.panel.webview.postMessage({ command: 'focusInput' });
        return;
    }

    // 3. 检查侧边栏视图
    if (this.webviewView) {
        await vscode.commands.executeCommand('workbench.view.extension.waveChatView');
        setTimeout(() => {
            this.webviewView.webview.postMessage({ command: 'focusInput' });
        }, 100);
        return;
    }

    // 4. 兜底：创建新的标签页视图
    await this.createOrShowChatPanel('tab');
    setTimeout(() => {
        this.panel.webview.postMessage({ command: 'focusInput' });
    }, 100);
}
```

#### React 端处理
```typescript
case 'focusInput':
  // 聚焦到输入框
  if (messageInputRef.current && typeof messageInputRef.current.focus === 'function') {
    messageInputRef.current.focus();
  }
  break;
```

### 📝 测试场景

1. **测试不同视图的聚焦**:
   - 打开标签页聊天，使用 `Ctrl+Shift+F` → 聚焦到标签页输入框
   - 打开独立窗口聊天，使用 `Ctrl+Shift+F` → 聚焦到窗口输入框
   - 打开侧边栏聊天，使用 `Ctrl+Shift+F` → 聚焦到侧边栏输入框

2. **测试优先级逻辑**:
   - 同时打开标签页和侧边栏聊天，使用聚焦命令 → 应该聚焦到标签页
   - 同时打开窗口、标签页、侧边栏，使用聚焦命令 → 应该聚焦到窗口

3. **测试兜底创建**:
   - 关闭所有聊天视图，使用 `Ctrl+Shift+F` → 应该自动创建标签页并聚焦

### 🎉 用户体验

- **一键聚焦**: 无论当前在哪里，一个快捷键就能回到聊天并开始输入
- **智能选择**: 自动选择最合适的聊天视图，无需手动判断
- **即开即用**: 没有聊天视图时自动创建，保证功能始终可用
- **快速上手**: 简单的快捷键，容易记忆和使用

这就是最简单直接的解决方案！