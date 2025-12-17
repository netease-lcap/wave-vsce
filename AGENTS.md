# AGENTS.md

This file provides guidance to Agent when working with code in this repository.

## Project Overview

This is **Wave VSCode Chat Extension** - a VS Code extension that provides an integrated AI chat interface powered by the Wave Agent SDK. It enables developers to interact with an AI assistant directly within VS Code, leveraging capabilities like file operations, code assistance, and tool integrations.

**Extension Details:**
- Publisher: `wave-code`
- Command: `wave-code.openChat`
- Keyboard shortcut: None (use Command Palette)
- Minimum VS Code version: 1.74.0

## Development Commands

```bash
# Install dependencies (using pnpm)
pnpm install

# Development build with watch mode (recommended during development)
pnpm run watch

# Build all packages
pnpm run build

# Production build for publishing
pnpm run package

# Run all tests (Playwright - tests are in webview package)
pnpm run test

# Run tests with UI interface
pnpm run test:ui

# Launch extension in development mode
# Open project in VS Code and press F5 to launch extension host
# Make sure to run `pnpm run watch:webview` in another terminal for webview changes
```

## Architecture Overview

### Monorepo Architecture
The project is organized as a pnpm monorepo with clear separation of concerns:

1. **Extension Backend** (`apps/vsce/` - Node.js/TypeScript)
   - Entry point: `apps/vsce/src/extension.ts`
   - Core logic: `apps/vsce/src/chatProvider.ts`
   - Manages Wave Agent SDK integration, webview lifecycle, and VS Code APIs
   - Output: `apps/vsce/dist/extension.js`

2. **Webview Frontend** (`apps/webview/` - React/TypeScript)
   - Entry: `apps/webview/src/index.tsx`
   - Main component: `ChatApp.tsx` with useReducer state management
   - Compiled to `apps/webview/dist/chat.js` via Webpack

3. **Shared Types** (`packages/shared-types/` - TypeScript)
   - Shared TypeScript definitions between backend and frontend
   - Ensures type safety across the extension boundary
   - Published as internal workspace package

### Key Files & Responsibilities

| File | Purpose |
|------|---------|
| `apps/vsce/src/extension.ts` | Extension activation, command registration |
| `apps/vsce/src/chatProvider.ts` | Core provider managing agent/webview bridge, session management |
| `apps/webview/src/components/ChatApp.tsx` | Root React component with reducer-based state management |
| `apps/webview/src/components/Message.tsx` | Message rendering with markdown parsing and tool display |
| `apps/webview/src/components/MessageList.tsx` | Auto-scrolling message container |
| `apps/webview/src/components/MessageInput.tsx` | User input with dynamic textarea resize |
| `apps/webview/src/components/ConfirmationDialog.tsx` | Tool permission confirmation UI |
| `packages/shared-types/src/index.ts` | Shared TypeScript type definitions |
| `apps/vsce/webpack.config.js` | Extension backend build configuration |
| `apps/webview/webpack.config.js` | Webview frontend build configuration |

### Message Flow Architecture

```
User Input → MessageInput → vscode.postMessage() → chatProvider.handleWebviewMessage()
                                                   → agent.sendMessage() (Wave Agent SDK)
                                                   → agent callbacks (onMessagesChange)
                                                   → panel.webview.postMessage() → ChatApp reducer
```

### State Management Pattern

The React frontend uses **useReducer pattern** with 10 action types:
- `SET_MESSAGES` - Update chat history
- `START_STREAMING` / `END_STREAMING` - UI state during responses
- `SET_SESSIONS` / `SET_CURRENT_SESSION` - Session management
- `SET_SESSIONS_LOADING` / `SET_SESSIONS_ERROR` - Async operation states
- `SHOW_CONFIRMATION` / `HIDE_CONFIRMATION` - Tool permission confirmation dialogs

## Build System

### Webpack Configuration
**Extension Backend:** `apps/vsce/webpack.config.js`
- Target: node
- Output: `apps/vsce/dist/extension.js` (CommonJS)

**Webview Frontend:** `apps/webview/webpack.config.js`
- Target: web
- Output: `apps/webview/dist/chat.js` (ES modules)

### TypeScript Setup
- Extension config: `apps/vsce/tsconfig.json`
- Webview config: `apps/webview/tsconfig.json`
- Shared types config: `packages/shared-types/tsconfig.json`
- Target: ES2020, strict type checking enabled

## Testing Architecture

### Playwright-based Testing
**Framework:** Playwright with custom webview test harness

**Key Innovation:** Tests load the React webview directly in Playwright instead of full VS Code:
- `apps/webview/tests/utils/webviewTestHarness.ts` - Loads React app with mocked vscode API
- `apps/webview/tests/utils/messageInjector.ts` - Simulates extension-to-webview messages
- `apps/webview/tests/fixtures/mockData.ts` - Realistic mock agent SDK data structures

**Test Coverage (9 test suites):**
- Basic message flow and exchanges
- Streaming message updates with progressive rendering
- Abort functionality during AI responses
- Error handling and recovery
- Session management and switching
- Clear chat functionality
- Tool display and results rendering
- UI state transitions (button states, loading indicators)
- Confirmation dialogs for tool permission requests

**Run tests:**
```bash
pnpm run test                    # Run all tests (from root)
pnpm run test:ui                 # Interactive test runner

# Or from webview directory:
cd apps/webview
pnpm run test                    # Run all tests
pnpm run test:ui                 # Interactive test runner
```

**Testing Guidelines:**
- Minimize console.log usage in e2e tests to keep output clean and focused.

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
**File:** `webview/src/styles/*.css`
Uses CSS variables for automatic theme adaptation:
```css
background-color: var(--vscode-editor-background);
color: var(--vscode-editor-foreground);
border: 1px solid var(--vscode-panel-border);
```

## Dependencies

### Core Dependencies
- **wave-agent-sdk** - Local file dependency (`file:../../wave-agent-sdk-0.0.8.tgz`)
- **marked 9.1.6** - Markdown parsing
- **dompurify 3.3.0** - HTML sanitization
- **React 18.0.0 + ReactDOM** - Frontend framework

### Development Dependencies
- **TypeScript 5.9.3** - Language
- **Webpack 5 + ts-loader** - Build system
- **Playwright 1.40.0** - Testing framework
- **css-loader + style-loader** - CSS bundling

## Development Workflow

### Local Development
1. `pnpm install` - Install dependencies
2. `pnpm run watch` - Start watch mode compilation
3. Open project in VS Code
4. Press `F5` to launch extension development host
5. Use Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and search "Wave: Open AI Chat" to open chat
6. Make changes → extension reloads automatically (use `Ctrl+R` in dev window)
7. Make sure to run `pnpm run watch:webview` in another terminal for webview changes

### Testing During Development
```bash
pnpm run test                     # Run full test suite
pnpm run test:ui                  # Interactive test runner for debugging
```

### Building for Distribution
```bash
pnpm run package             # Production build
npm install -g vsce         # Install packaging tool
vsce package               # Creates .vsix file
```

## Troubleshooting

### Common Issues

**Compilation Errors:**
- Check Node.js version compatibility (22.x recommended)
- Ensure `pnpm install` completed successfully
- Verify `wave-agent-sdk` local dependency path

**Extension Not Loading:**
- Confirm `apps/vsce/dist/extension.js` exists after compilation
- Check VS Code version meets minimum requirement (1.74.0)
- Restart VS Code after changes

**Webview Issues:**
- Verify `apps/webview/dist/chat.js` was generated
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