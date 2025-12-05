# Change: Simplify Session Management Operations

## Why
The current session management implementation is overly complex, using agent destruction and recreation for basic operations like clearing sessions and switching between sessions. The wave-agent-sdk provides simpler methods that should be used instead:
- `agent.sendMessage('/clear')` for clearing current session
- `agent.restoreSession()` for switching sessions

This complexity leads to unnecessary resource overhead, potential race conditions, and more complicated error handling.

## What Changes
- Replace clear chat operation: Use `agent.sendMessage('/clear')` instead of destroying and recreating agent
- Replace session restoration: Use `agent.restoreSession()` method instead of destroying and recreating agent  
- Simplify error handling and state management by removing agent lifecycle complexity
- Maintain existing UI/UX behavior while using more efficient backend operations

## Impact
- Affected specs: vscode-chat (session management requirements)
- Affected code: 
  - `src/chatProvider.ts` - session operations methods
  - Webview components remain unchanged (no UI changes)
- Performance improvement: Faster session operations, reduced memory usage
- Reliability improvement: Fewer potential race conditions and resource leaks