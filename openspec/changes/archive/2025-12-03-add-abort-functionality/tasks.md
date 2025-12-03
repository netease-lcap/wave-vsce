## 1. UI Enhancement
- [x] 1.1 Add abort button next to send button that shows during streaming
- [x] 1.2 Position abort button in the input row alongside send button
- [x] 1.3 Style abort button to match VS Code theme (secondary button style)
- [x] 1.4 Show/hide abort button based on streaming state only

## 2. Frontend Logic
- [x] 2.1 Add abort message command to webview JavaScript
- [x] 2.2 Send abort command from webview to extension
- [x] 2.3 Update streaming state management to handle aborts
- [x] 2.4 Mark aborted messages with "Aborted" indicator and keep partial content

## 3. Backend Integration  
- [x] 3.1 Add abort message handler in ChatProvider
- [x] 3.2 Call agent.abortMessage() when abort is requested
- [x] 3.3 Reset streaming state after abort
- [x] 3.4 Handle message finalization with abort indicator

## 4. Testing and Polish
- [x] 4.1 Test abort functionality during streaming responses
- [x] 4.2 Verify abort button shows/hides correctly
- [x] 4.3 Ensure aborted messages display partial content with indicator
- [x] 4.4 Test that new messages can be sent after abort