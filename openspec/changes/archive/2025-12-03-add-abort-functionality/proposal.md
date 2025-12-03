# Change: Add Message Abort Functionality

## Why
Users need the ability to stop AI message generation when it's taking too long, going in the wrong direction, or when they want to ask a different question. Currently, users must wait for the AI to complete its response before sending new messages.

## What Changes
- Add an "Abort" button next to the send button that appears during streaming responses
- Integrate the Agent SDK's `abortMessage()` method to stop AI message generation
- Keep partial content with an "Aborted" indicator when messages are interrupted
- Show/hide abort button based on streaming state (no multiple abort handling needed)
- Provide clear visual feedback for aborted messages

## Impact
- Affected specs: vscode-chat (enhanced user control capability)
- Affected code: Chat webview UI and ChatProvider message handling
- Dependencies: Existing wave-agent-sdk `abortMessage()` method
- User experience: Users can interrupt long-running AI responses for better interactivity