# Change: Add VS Code Extension with Chat Interface

## Why
Developers need a seamless way to interact with AI agents directly within their VS Code editor to get help with current projects, write code, and modify files without switching contexts.

## What Changes
- Create a VS Code extension with a chat interface
- Integrate with wave-agent-sdk to communicate with task AI
- Use webview API for the chat UI
- Support real-time message updates using onMessagesChange callback
- Allow users to send messages about current project context
- Enable AI to write and modify files based on user requests

## Impact
- Affected specs: vscode-chat (new capability)
- Affected code: New VS Code extension project structure
- Dependencies: wave-agent-sdk (via npm link during development)