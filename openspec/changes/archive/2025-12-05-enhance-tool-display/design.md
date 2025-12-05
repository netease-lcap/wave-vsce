# Design: Enhanced Tool Display

## Problem Statement

The current tool display shows full parameter details in expanded blocks, which:
- Takes up significant vertical space in the chat interface
- Makes the conversation flow feel disjointed with prominent visual separators
- Shows potentially verbose parameter content that may not be essential for user understanding

## Design Goals

1. **Compact Information Display**: Show essential tool information inline without expanding full parameters
2. **Unified Conversation Flow**: Remove visual barriers between messages to create seamless chat experience
3. **Preserved Functionality**: Maintain all existing tool execution and display capabilities

## Solution Architecture

### Tool Parameter Usage Strategy

The wave-agent-sdk ToolBlock interface already provides a `compactParams?: string` field specifically for this purpose.

**Approach: Use Existing compactParams Field**
- Display `toolBlock.compactParams` when available
- Fall back to tool name only when `compactParams` is undefined
- No custom parameter processing needed

**Parameter Display Examples:**
```typescript
// ToolBlock with compactParams:
{
  name: "Read",
  compactParams: "file.ts",
  parameters: '{"file_path": "/long/path/to/file.ts"}'
}

// Display: "🛠️ Read file.ts"
```

### Visual Design Changes

**Current Message Layout:**
```
┌─────────────────────────┐
│  Assistant Message      │
│  ┌───────────────────┐  │
│  │ 🛠️ Tool Name      │  │
│  │ parameters...     │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

**Proposed Layout:**
```
Assistant Message
🛠️ Tool Name compact-params
Next message flows directly...
```

### Implementation Strategy

**Component Changes:**
1. **Message.tsx**: Modify tool block rendering to use `toolBlock.compactParams` instead of `toolBlock.parameters`
2. **CSS Updates**: Remove message borders/backgrounds, adjust tool block styling for inline display

**compactParams Usage Logic:**
1. Check if `toolBlock.compactParams` is defined and non-empty
2. Display "🛠️ {toolName} {compactParams}" when available
3. Fall back to "🛠️ {toolName}" when compactParams is undefined
4. Remove the existing `<pre>` block that shows full parameters

## Trade-offs and Considerations

### Information Availability vs. Cleanliness
- **Trade-off**: Compact display may show less detail than full parameters
- **Mitigation**: agent SDK provides curated compactParams specifically for this purpose
- **Benefit**: No information loss since compactParams is designed by the agent for essential context

### compactParams Availability
- **Consideration**: Not all tools may provide compactParams field
- **Approach**: Graceful fallback to tool name only when compactParams is undefined
- **Future**: All agent SDK tools should populate compactParams for consistent UX

### Visual Accessibility
- **Risk**: Removing message boundaries could make conversation harder to follow
- **Mitigation**: Preserve other visual cues (message alignment, timestamps if present)
- **Preserve**: Error message styling remains distinct for critical visibility

## Technical Implementation Details

### Compact Parameter Usage
```typescript
// Use existing compactParams field
function renderToolBlock(toolBlock: ToolBlock): string {
  const compactInfo = toolBlock.compactParams || '';
  return `🛠️ ${toolBlock.name} ${compactInfo}`.trim();
}
```

### CSS Architecture Changes
- Remove `.message` background and border properties
- Adjust `.tool-block` to work as inline element
- Maintain responsive layout considerations
- Preserve accessibility contrast requirements

## Future Enhancements

- **Progressive Disclosure**: Click to expand full parameters when needed
- **Smart Parameter Detection**: Learn which parameters are most useful to show
- **Customizable Compaction**: User preferences for detail level