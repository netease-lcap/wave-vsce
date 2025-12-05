# Tasks for Enhance Tool Display

## Task Sequence

### Phase 1: Tool Display Compact Parameters
1. **Analyze current tool parameter structure**
   - Examine ToolBlock interface from wave-agent-sdk
   - Identify common parameter patterns in real usage
   - Determine optimal compact representation strategy

2. **Use existing compactParams field**
   - Examine ToolBlock.compactParams field usage in current implementation
   - Identify fallback behavior when compactParams is undefined
   - Determine display strategy for tools without compactParams

3. **Update tool block rendering**
   - Modify Message.tsx tool block rendering section (lines 105-114)
   - Replace header + pre structure with inline compact format
   - Display tool icon, name, and compactParams (when available) in single line
   - Handle cases where compactParams is undefined

4. **Update tool block styles**
   - Modify .tool-block styles in globals.css to support inline layout
   - Adjust .tool-header styles for inline compact display
   - Remove or modify .tool-block pre styles since pre block is removed

### Phase 2: Message Visual Unification
5. **Remove message backgrounds and borders**
   - Update .message class in globals.css to remove background-color and border
   - Remove .message.assistant, .message.user background and border styles
   - Preserve .message.error styling for critical error visibility

6. **Adjust message spacing and alignment**
   - Modify message container spacing to work without visual separators
   - Ensure proper readability with reduced visual distinction
   - Test that message flow appears unified but readable

7. **Verify responsive layout**
   - Test that tool blocks work properly in unified message layout
   - Ensure compact parameters don't break on narrow screens
   - Validate that message alignment (user right, assistant left) still works

### Phase 3: Testing and Refinement
8. **Test with real tool execution scenarios**
   - Verify compactParams field is populated by agent SDK
   - Test display when compactParams is present vs. absent
   - Validate that essential tool information is preserved in compact format

9. **Visual design verification**
   - Confirm unified message flow improves readability
   - Check that messages are still distinguishable when needed
   - Ensure accessibility standards are maintained

10. **Update test fixtures if needed**
    - Update any webview tests that depend on specific tool block structure
    - Verify Playwright tests still pass with new tool display format
    - Update mock data generators if tool display changes affect test expectations

## Validation Criteria

- Tool blocks display compactly using existing compactParams field when available
- Full parameter details are no longer shown in expanded pre blocks  
- Tools without compactParams show tool name only in compact format
- Messages flow together visually without prominent borders/backgrounds
- Error messages maintain distinctive styling for critical visibility
- All existing functionality works with new visual presentation
- Webview tests pass with updated tool display format