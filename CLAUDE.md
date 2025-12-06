# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **Wave VSCode Chat Extension** - a VS Code extension that provides an integrated AI chat interface powered by the Wave Agent SDK. It enables developers to interact with an AI assistant directly within VS Code, leveraging capabilities like file operations, code assistance, and tool integrations.

**Extension Details:**
- Publisher: `wave-code`
- Command: `wave-code.openChat`
- Keyboard shortcut: `Ctrl+Shift+W` (Windows/Linux), `Cmd+Shift+W` (Mac)
- Minimum VS Code version: 1.74.0

## Development Commands

```bash
# Install dependencies
npm install

# Development build with watch mode (recommended during development)
npm run watch

# One-time compilation
npm run compile

# Production build for publishing
npm run package

# Run all tests (Playwright)
npm test

# Run tests with UI interface
npm run test:playwright:ui

# Launch extension in development mode
# Open project in VS Code and press F5 to launch extension host
```

## Architecture Overview

### Dual-Component Architecture
The extension uses VS Code's extension-webview architecture with clear separation:

1. **Extension Backend** (`src/` - Node.js/TypeScript)
   - Entry point: `src/extension.ts` (44 lines)
   - Core logic: `src/chatProvider.ts` (380+ lines)
   - Manages Wave Agent SDK integration, webview lifecycle, and VS Code APIs

2. **Webview Frontend** (`webview/src/` - React/TypeScript)
   - Entry: `webview/src/index.tsx`
   - Main component: `ChatApp.tsx` with useReducer state management
   - Compiled to `webview/dist/chat.js` via Webpack

### Key Files & Responsibilities

| File | Purpose |
|------|---------|
| `src/extension.ts` | Extension activation, command registration |
| `src/chatProvider.ts` | Core provider managing agent/webview bridge, session management |
| `webview/src/components/ChatApp.tsx` | Root React component with reducer-based state management |
| `webview/src/components/Message.tsx` | Message rendering with markdown parsing and tool display |
| `webview/src/components/MessageList.tsx` | Auto-scrolling message container |
| `webview/src/components/MessageInput.tsx` | User input with dynamic textarea resize |
| `webview/src/types/index.ts` | Shared TypeScript type definitions |
| `webpack.config.js` | Dual build configuration (extension + webview) |

### Message Flow Architecture

```
User Input → MessageInput → vscode.postMessage() → chatProvider.handleWebviewMessage()
                                                   → agent.sendMessage() (Wave Agent SDK)
                                                   → agent callbacks (onMessagesChange)
                                                   → panel.webview.postMessage() → ChatApp reducer
```

### State Management Pattern

The React frontend uses **useReducer pattern** with 8 action types:
- `SET_MESSAGES` - Update chat history
- `START_STREAMING` / `END_STREAMING` - UI state during responses
- `SET_SESSIONS` / `SET_CURRENT_SESSION` - Session management
- `SET_SESSIONS_LOADING` / `SET_SESSIONS_ERROR` - Async operation states

## Build System

### Webpack Configuration
**File:** `webpack.config.js` exports dual configurations:
1. **Extension Config**: Target=node, Output=dist/extension.js (CommonJS)
2. **Webview Config**: Target=web, Output=webview/dist/chat.js (ES modules)

Both builds run in parallel with `npm run compile`.

### TypeScript Setup
- Root config: `tsconfig.json` (extension)
- Webview config: `webview/tsconfig.json` (React-specific)
- Target: ES2020, strict type checking enabled

## Testing Architecture

### Playwright-based Testing
**Framework:** Playwright with custom webview test harness

**Key Innovation:** Tests load the React webview directly in Playwright instead of full VS Code:
- `tests/utils/webviewTestHarness.ts` - Loads React app with mocked vscode API
- `tests/utils/messageInjector.ts` - Simulates extension-to-webview messages
- `tests/fixtures/mockData.ts` - Realistic mock agent SDK data structures

**Test Coverage (8 test suites):**
- Basic message flow and exchanges
- Streaming message updates with progressive rendering
- Abort functionality during AI responses
- Error handling and recovery
- Session management and switching
- Clear chat functionality
- Tool display and results rendering
- UI state transitions (button states, loading indicators)

**Run tests:**
```bash
npm test                    # Run all tests
npm run test:playwright:ui  # Interactive test runner
```

## Key Technical Patterns

### 1. Agent Integration
**File:** `src/chatProvider.ts:48-52`
```typescript
const callbacks: MessageManagerCallbacks = {
  onMessagesChange: (messages: Message[]) => {
    this.updateChatMessages(messages);
  }
};
```
Uses single callback for all message changes instead of multiple event handlers.

### 2. Session Persistence
Sessions managed via Wave Agent SDK:
- `agent.listSessions()` - Discover past sessions
- `agent.restoreSession(sessionId)` - Resume existing sessions
- Session metadata: id, workdir, lastActiveAt, latestTotalTokens

### 3. Streaming-Aware UI
**Auto-scroll logic in `MessageList.tsx:18-34`:**
- Always scrolls during streaming (user expects to see new content)
- Only scrolls if user near bottom when not streaming
- Uses smooth scroll behavior for UX

### 4. Markdown Rendering with Security
**In `Message.tsx`:**
- Uses `marked.js` for GitHub Flavored Markdown
- `DOMPurify` prevents XSS attacks in rendered HTML
- Block-based rendering: text, error, tool, memory blocks

### 5. VS Code Theme Integration
**File:** `webview/src/styles/globals.css`
Uses CSS variables for automatic theme adaptation:
```css
background-color: var(--vscode-editor-background);
color: var(--vscode-editor-foreground);
border: 1px solid var(--vscode-panel-border);
```

## Dependencies

### Core Dependencies
- **wave-agent-sdk** - Local file dependency (`file:../../personal-projects/wave-agent/packages/agent-sdk`)
- **marked 9.1.6** - Markdown parsing
- **dompurify 3.3.0** - HTML sanitization
- **React 18.0.0 + ReactDOM** - Frontend framework

### Development Dependencies
- **TypeScript 4.9.4** - Language
- **Webpack 5 + ts-loader** - Build system
- **Playwright 1.40.0** - Testing framework
- **css-loader + style-loader** - CSS bundling

## Development Workflow

### Local Development
1. `npm install` - Install dependencies
2. `npm run watch` - Start watch mode compilation
3. Open project in VS Code
4. Press `F5` to launch extension development host
5. Use `Ctrl+Shift+W` in the new window to open chat
6. Make changes → extension reloads automatically (use `Ctrl+R` in dev window)

### Testing During Development
```bash
npm test                     # Run full test suite
npm run test:playwright:ui   # Interactive test runner for debugging
```

### Building for Distribution
```bash
npm run package             # Production build
npm install -g vsce         # Install packaging tool
vsce package               # Creates .vsix file
```

## Troubleshooting

### Common Issues

**Compilation Errors:**
- Check Node.js version compatibility (18.x recommended)
- Ensure `npm install` completed successfully
- Verify `wave-agent-sdk` local dependency path

**Extension Not Loading:**
- Confirm `dist/extension.js` exists after compilation
- Check VS Code version meets minimum requirement (1.74.0)
- Restart VS Code after changes

**Webview Issues:**
- Verify `webview/dist/chat.js` was generated
- Check browser console in VS Code Developer Tools (`Help > Toggle Developer Tools`)
- Ensure React components compile without TypeScript errors

**Test Failures:**
- Run `npm run compile` before testing
- Check Playwright browser dependencies are installed
- Use `npm run test:playwright:ui` for visual debugging

### Development Tools
- **VS Code Developer Tools:** `Help > Toggle Developer Tools` - View webview console
- **Extension Host Reload:** `Ctrl+R`/`Cmd+R` in development window
- **Webpack Watch Mode:** `npm run watch` for automatic recompilation