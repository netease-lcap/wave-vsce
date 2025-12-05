## 1. Update Clear Chat Implementation
- [x] 1.1 Modify `clearChat()` method in `src/chatProvider.ts` to use `agent.sendMessage('/clear')` instead of `initializeAgent()`
- [x] 1.2 Remove agent destruction and recreation logic from clear chat operation
- [x] 1.3 Update error handling to match simpler clear operation

## 2. Update Session Restoration Implementation  
- [x] 2.1 Modify `restoreSession()` method in `src/chatProvider.ts` to use `agent.restoreSession(sessionId)` instead of agent destruction/recreation
- [x] 2.2 Remove agent destroy and `initializeAgent(sessionId)` calls from session restoration
- [x] 2.3 Update error handling for the simplified session restoration approach
- [x] 2.4 Ensure current session metadata is properly updated after restoration

## 3. Testing and Validation
- [x] 3.1 Test clear chat functionality works correctly with new implementation
- [x] 3.2 Test session switching works correctly with new implementation
- [x] 3.3 Verify no memory leaks or resource issues with simplified approach
- [x] 3.4 Update any existing tests that may depend on agent destruction/recreation behavior