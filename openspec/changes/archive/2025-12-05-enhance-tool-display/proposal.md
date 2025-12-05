# Enhance Tool Display

## Context

Currently, tool blocks are displayed with:
- Tool icon and name in header
- Full parameters displayed in a `<pre>` block below the header
- Messages have borders and background colors that visually separate them

The user wants to:
1. Display compact parameters inline with the tool name instead of full parameters block
2. Remove message borders and backgrounds to create a more unified conversation flow

## Goals

- Improve tool display compactness by showing essential info inline
- Create a cleaner, more unified message flow appearance
- Maintain readability and functionality while reducing visual clutter

## Non-Goals

- Changing the underlying tool execution functionality
- Modifying how tool data is received from the agent SDK
- Altering other block types (text, error, memory blocks)

## Solution Overview

### Tool Display Changes
Replace the current tool block layout:
```
🛠️ ToolName
parameters...
```

With a compact inline format:
```
🛠️ ToolName compactParams
```

Where `compactParams` is the existing field provided by the wave-agent-sdk ToolBlock interface.

### Message Visual Changes
Remove the current message styling that includes:
- Background colors for different message types
- Borders around messages
- Visual separation between messages

This will create a more continuous, chat-like appearance where multiple messages flow together.

## Implementation Approach

### Tool Block Rendering
- Modify the `Message.tsx` component's tool block rendering
- Use the existing `compactParams` field from ToolBlock instead of full `parameters`
- Remove the `<pre>` block that shows full parameters
- Display `compactParams` inline with tool name when available

### Message Styling
- Update `globals.css` to remove message backgrounds and borders
- Preserve essential visual distinctions (like error states) while removing separation
- Maintain proper spacing and readability

## Considerations

### Compact Parameters Format
The agent SDK already provides `compactParams` field in ToolBlock:
- Use existing `compactParams` string when available
- Fall back to tool name only if `compactParams` is not provided
- No custom parameter parsing or abbreviation needed

### Accessibility
- Ensure tool information remains accessible
- Maintain sufficient contrast and readability
- Preserve semantic HTML structure

### Backwards Compatibility
- Changes affect visual presentation only
- No breaking changes to data structures or APIs
- Existing functionality remains intact