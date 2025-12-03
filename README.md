# Wave AI Chat Extension

A VS Code extension that provides an integrated chat interface for AI assistance using the Wave Agent SDK.

## Features

- **AI Chat Interface**: Interactive chat panel within VS Code
- **Project Awareness**: AI can analyze and understand your current workspace
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

- **Analyze Project**: Click the "Analyze Project" button to have AI examine your workspace
- **Clear Chat**: Start a fresh conversation
- **File Operations**: Ask AI to read, write, or modify files in your project

## Requirements

- VS Code 1.74.0 or higher
- Wave Agent SDK (automatically installed via npm)

## Development

The extension uses the Wave Agent SDK to communicate with AI agents. The SDK is installed as a regular npm dependency from the published package.

## License

MIT