# Change: Add Session Selector to Chat Interface

## Why
Users need the ability to restore and switch between different chat sessions instead of being limited to a single continuous session. This improves workflow efficiency and allows users to manage multiple conversation contexts within the same project.

## What Changes
- Add a session selector dropdown in the left top area of the chat interface
- Integrate wave-agent-sdk's `listSessions` API to populate session options with SessionMetadata
- Add session restoration functionality using existing SessionData/SessionMetadata types
- Update UI layout to accommodate the session selector component
- Add proper loading states and error handling for session operations
- Reuse existing wave-agent-sdk types (SessionMetadata, SessionData) for type safety

## Impact
- Affected specs: vscode-chat 
- Affected code: 
  - webview/src/components/ChatHeader.tsx (add session selector)
  - webview/src/components/ChatApp.tsx (session state management)
  - webview/src/types/index.ts (import SessionMetadata/SessionData from wave-agent-sdk)
  - src/chatProvider.ts (session listing and restoration backend)
- New components: SessionSelector component using SessionMetadata types
- UI/UX: Better session management user experience