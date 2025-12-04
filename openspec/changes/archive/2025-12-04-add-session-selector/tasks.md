## 1. Backend Session Integration
- [x] 1.1 Add session listing handler to chatProvider.ts to call wave-agent-sdk listSessions returning SessionMetadata[]
- [x] 1.2 Add session restoration handler with proper agent cleanup (destroy old agent before creating new one)
- [x] 1.3 Add webview message handlers for 'listSessions' and 'restoreSession' commands
- [x] 1.4 Update agent initialization to support session restoration parameter from SessionMetadata
- [x] 1.5 Add error handling for session operations and agent lifecycle management in backend

## 2. Frontend Session Selector Component  
- [x] 2.1 Create SessionSelector React component in webview/src/components/
- [x] 2.2 Add SessionSelector to ChatHeader component in left top position
- [x] 2.3 Implement session dropdown with loading and error states
- [x] 2.4 Add session selection logic and communication with VS Code extension
- [x] 2.5 Style SessionSelector component to match VS Code design system

## 3. UI Layout Updates
- [x] 3.1 Update ChatHeader layout to accommodate SessionSelector in left position
- [x] 3.2 Ensure header buttons (clear, analyze) remain accessible on the right

## 4. Type Definitions and State Management
- [x] 4.1 Import SessionMetadata and SessionData types from wave-agent-sdk in types/index.ts
- [x] 4.2 Add session selector props interface using SessionMetadata type
- [x] 4.3 Update ChatState to include current SessionMetadata information
- [x] 4.4 Add session-related actions to ChatAction type union using SessionMetadata
- [x] 4.5 Update chatReducer to handle session state changes with proper typing

## 5. Session Management Logic
- [x] 5.1 Add session fetching logic to ChatApp component
- [x] 5.2 Implement session switching functionality with proper state updates  
- [x] 5.3 Add session validation and error handling in webview
- [x] 5.4 Ensure session switching is disabled during streaming operations
- [x] 5.5 Add loading states for session operations in UI

## 6. Testing and Validation
- [x] 6.1 Test session selector with multiple existing sessions
- [x] 6.2 Test session restoration functionality end-to-end with proper agent cleanup
- [x] 6.3 Test UI layout changes for session selector
- [x] 6.4 Test error handling for session operations and agent lifecycle
- [x] 6.5 Verify that existing functionality remains unaffected
- [x] 6.6 Test memory cleanup and ensure no resource leaks during session switching