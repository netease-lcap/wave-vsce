# Design: Message Abort Functionality

## Overview
This design adds the ability for users to interrupt AI message generation using the Agent SDK's `abortMessage()` method, with clear UI patterns and content preservation.

## UI Design Decisions

### Button Placement
- **Location**: Next to the send button in the input row
- **Rationale**: Users expect control actions near the primary action (send), provides natural flow
- **Layout**: `[Input Field] [Abort] [Send]` when streaming, `[Input Field] [Send]` when idle

### Visual Design
- **Style**: Secondary VS Code button style to differentiate from primary send action
- **Icon**: Stop/square icon to indicate interruption action
- **State**: Only visible during streaming, hidden otherwise

### Content Handling
- **Preservation**: Keep partial message content when aborted
- **Indicator**: Clear "Aborted" label/badge on interrupted messages  
- **Distinction**: Visually differentiate aborted messages from completed ones

## Technical Architecture

### State Management
```
isStreaming: boolean
- true: Show abort button, disable send
- false: Hide abort button, enable send
```

### Message Flow
1. User sends message → `isStreaming = true` → Show abort button
2. User clicks abort → Call `agent.abortMessage()` → Mark partial content as aborted
3. Reset state → `isStreaming = false` → Hide abort button, enable send

### Agent Integration
- Use existing `agent.abortMessage()` method
- Handle abort in same callback pattern as other agent events
- Ensure streaming callbacks stop after abort

## User Experience

### Happy Path
1. User sees long AI response starting
2. Abort button appears next to send button
3. User clicks abort to stop unwanted response
4. Partial content remains with "Aborted" indicator
5. User can immediately send new message

### Edge Cases
- Abort during tool execution: Stop both AI and tools
- Abort at message start: Show minimal content with abort indicator
- Network issues: Graceful handling of abort failures

## Implementation Considerations

### No Multiple Abort Handling
- Simple design: one abort per message
- Abort button disabled/hidden after first click
- No need for abort queuing or repeated abort logic

### Performance
- Minimal UI impact: single button show/hide
- No polling required: event-driven abort state
- Immediate user feedback on abort action