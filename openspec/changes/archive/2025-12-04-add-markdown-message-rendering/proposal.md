# Change: Add Markdown Rendering for Message Content

## Why
Currently, AI assistant responses containing markdown syntax are displayed as plain text with visible markdown formatting (e.g., **bold**, `code`, ## headers). This reduces readability and provides a poor user experience compared to properly formatted content. Users expect formatted text output when the AI generates markdown, similar to other chat interfaces and documentation tools.

## What Changes
- Add markdown parsing and rendering capability to the chat webview using 3rd party packages
- Install `marked` (lightweight markdown parser) and `dompurify` (HTML sanitizer) as dependencies
- Update the Message component to use marked for parsing and dompurify for sanitizing rendered HTML
- Apply markdown rendering selectively: text blocks and memory blocks get markdown processing, while tool blocks, error blocks, and other content-bearing blocks remain as plain text
- Configure marked with appropriate options for VS Code webview context
- Apply proper CSS styling for markdown elements (headings, code blocks, lists, etc.) that integrates with VS Code themes

## Impact
- Affected specs: vscode-chat
- Affected code: 
  - package.json (new dependencies: marked ^9.0.0, dompurify ^3.0.0, and their TypeScript types)
  - webview/src/components/Message.tsx (markdown parsing and rendering logic)
  - webview/src/styles/globals.css (markdown element styling)
- Bundle size: Approximately +50KB for marked and dompurify libraries
- Performance: Minimal impact as parsing occurs only on message render, not during streaming