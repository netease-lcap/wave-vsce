# Change: Set Agent Working Directory to VS Code Workspace Path

## Why
When users open the Wave AI Chat extension in different VS Code projects, they expect the AI agent to operate within the context of their current project. Currently, the agent's working directory is not explicitly set, which means it defaults to process.cwd() and may not align with the user's current workspace, leading to confusion when the agent operates on files or needs project context.

## What Changes
- Configure the Agent instance to use the first VS Code workspace folder path as its working directory
- Automatically detect and use the primary workspace when initializing the agent
- Handle edge cases where no workspace is open (fallback to current behavior)  
- For multi-root workspaces, use the first workspace folder as the agent's single working directory
- Listen for workspace folder changes and properly destroy/recreate agent when the first folder changes
- Call `agent.destroy()` before creating new agent instance with different working directory

## Impact
- Affected specs: vscode-chat (Project Context Integration requirement needs modification)
- Affected code: src/chatProvider.ts (Agent initialization in initializeAgent method)
- User experience: Users will have more predictable AI behavior that operates in their primary project context
- Backward compatibility: Maintains existing behavior when no workspace is open
- Limitation: For multi-root workspaces, only the first workspace folder is used as the agent's working directory