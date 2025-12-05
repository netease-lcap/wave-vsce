# Wave AI Chat Extension

A VS Code extension that provides an integrated chat interface for AI assistance using the Wave Agent SDK.

## Features

- **AI Chat Interface**: Interactive chat panel within VS Code
- **Real-time Responses**: Streaming responses with live message updates
- **File Operations**: AI can read, write, and modify files in your project
- **Tool Integration**: View AI tool usage and results in the chat

## Installation & Development

1. Clone this repository
2. Install dependencies: `npm install`
3. Compile: `npm run compile`
4. Press F5 to launch the extension in a new VS Code window

## Usage

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run "Wave: Open AI Chat" or use the keyboard shortcut `Ctrl+Shift+W` / `Cmd+Shift+W`
3. Start chatting with the AI about your project!

## Quick Actions

- **Clear Chat**: Start a fresh conversation
- **File Operations**: Ask AI to read, write, or modify files in your project

## Requirements

- VS Code 1.74.0 or higher
- Wave Agent SDK (automatically installed via npm)

## Development

The extension consists of two main components:

### Extension Backend (TypeScript)
- Uses the Wave Agent SDK to communicate with AI agents
- Manages VS Code webview and message passing
- Located in `src/` directory

### Webview Frontend (React + TypeScript)  
- Modern React interface with TypeScript for type safety
- Source code located in `webview/src/` directory
- Built with webpack to produce `webview/dist/chat.js`

### Build Process
```bash
npm install          # Install dependencies
npm run compile      # Build both extension and webview
npm run watch        # Watch mode for development
npm test            # Run Playwright tests
```

**Note**: The webview build artifacts in `webview/dist/` are auto-generated and excluded from git.

### Architecture
- **Extension**: TypeScript compiled to `dist/extension.js`
- **Webview**: React/TypeScript compiled to `webview/dist/chat.js`
- **Tests**: Playwright tests in `tests/webview/` directory

## License

MIT