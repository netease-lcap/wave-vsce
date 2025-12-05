# vscode-chat Specification

## Purpose
TBD - created by archiving change add-vscode-chat-extension. Update Purpose after archive.
## Requirements
### Requirement: VS Code Extension Registration
The system SHALL provide a VS Code extension that registers with the editor and provides chat functionality.

#### Scenario: Extension activation
- **WHEN** VS Code starts and the extension is installed
- **THEN** the extension activates and registers its commands

#### Scenario: Chat command availability
- **WHEN** user opens VS Code command palette
- **THEN** the "Open AI Chat" command is available

### Requirement: Chat Interface
The system SHALL provide a React and TypeScript-based webview chat interface for AI interaction with strong type safety and component-based architecture, including session management capabilities and enhanced tool display with compact parameter representation.

#### Scenario: Tool execution display with compact parameters
- **WHEN** AI executes tools during message generation
- **THEN** tool status updates are displayed using React components with compact inline format
- **AND** tool blocks show tool icon, name, and compactParams (when available) in a single line
- **AND** full parameter details are not expanded in separate blocks
- **AND** compact parameter representation uses the existing ToolBlock.compactParams field

#### Scenario: Message visual flow unification
- **WHEN** multiple messages are displayed in the chat interface
- **THEN** messages flow together without prominent visual separators
- **AND** message borders and backgrounds are removed for unified appearance
- **AND** message content remains readable and accessible
- **AND** error messages maintain distinctive styling for critical visibility

### Requirement: Agent SDK Integration
The system SHALL integrate with wave-agent-sdk to communicate with AI agents.

#### Scenario: Agent initialization
- **WHEN** the extension activates
- **THEN** an Agent instance is created with appropriate callbacks

#### Scenario: Real-time message updates
- **WHEN** the agent's message list changes
- **THEN** the chat interface updates via onMessagesChange callback

#### Scenario: Message sending
- **WHEN** user submits a chat message
- **THEN** the message is sent to the agent via sendMessage method

### Requirement: Project Context Integration
The system SHALL enable AI to understand and modify the current VS Code workspace and operate with the workspace as its working directory, properly handling workspace changes.

#### Scenario: Workspace access
- **WHEN** AI needs project context
- **THEN** the agent can access current workspace files and structure

#### Scenario: File modification
- **WHEN** AI decides to write or modify files
- **THEN** the changes are applied to the actual workspace files

#### Scenario: Project introduction
- **WHEN** user asks AI about the current project
- **THEN** AI can analyze and describe the project structure and purpose

#### Scenario: Agent working directory set to workspace
- **WHEN** the extension initializes the agent with a workspace open
- **THEN** the agent's working directory is set to the current workspace folder path
- **AND** file operations default to the workspace context

#### Scenario: Agent working directory fallback
- **WHEN** the extension initializes the agent with no workspace open
- **THEN** the agent's working directory uses the default behavior (process.cwd())
- **AND** the agent functions normally without workspace-specific context

#### Scenario: Workspace path detection
- **WHEN** multiple workspace folders are available
- **THEN** the agent uses the first workspace folder as the working directory (due to agent SDK single workdir limitation)
- **AND** the chosen workspace path is logged for user awareness

#### Scenario: Multi-root workspace folder changes
- **WHEN** the user adds or removes workspace folders (beyond the first folder)  
- **THEN** the system detects the change via `vscode.workspace.onDidChangeWorkspaceFolders`
- **AND** the agent's working directory remains unchanged (still uses first workspace folder)
- **AND** no agent reinitialization is needed since working directory is unaffected

#### Scenario: Primary workspace folder changes
- **WHEN** the user adds, removes, or changes the first workspace folder
- **THEN** VS Code terminates and restarts the extension
- **AND** the extension's `deactivate()` method is called, properly destroying the agent
- **AND** the extension's `activate()` method is called, creating a new agent with the new first workspace folder

#### Scenario: Extension deactivation cleanup
- **WHEN** the extension deactivates (workspace switch, VS Code close, etc.)
- **THEN** the agent instance is properly destroyed via `agent.destroy()`
- **AND** resources are cleaned up to prevent memory leaks

### Requirement: Development Setup
The system SHALL support development workflow with published npm package integration.

#### Scenario: Published SDK usage
- **WHEN** developing the extension
- **THEN** the extension uses wave-agent-sdk via published npm package

#### Scenario: SDK updates
- **WHEN** agent-sdk is updated and published
- **THEN** the extension can update to the latest version via npm update

### Requirement: Message Abortion Control
The system SHALL provide users the ability to interrupt AI message generation in progress.

#### Scenario: Abort button positioning
- **WHEN** AI is generating a streaming response
- **THEN** an abort button appears next to the send button in the input area
- **AND** the abort button is styled as a secondary VS Code button

#### Scenario: Abort button hidden when idle
- **WHEN** no AI message is being generated
- **THEN** the abort button is not visible in the input area

#### Scenario: Successful message abort with content preservation
- **WHEN** user clicks the abort button during streaming
- **THEN** the AI message generation stops immediately
- **AND** the partial message content is preserved in the chat
- **AND** an "Aborted" indicator is shown with the partial message
- **AND** the streaming state is reset
- **AND** the user can send a new message

#### Scenario: Abort during tool execution
- **WHEN** user aborts while AI is executing tools
- **THEN** both the AI response and any running tools are interrupted
- **AND** the partial content and tool results are preserved with abort indicator

### Requirement: User Feedback for Abort Actions
The system SHALL provide clear feedback when abort operations are performed.

#### Scenario: Aborted message display
- **WHEN** user successfully aborts a message
- **THEN** the partial message content remains visible in the chat
- **AND** an "Aborted" indicator is clearly displayed with the message
- **AND** the message is visually distinct from completed messages

#### Scenario: Abort button interaction
- **WHEN** user hovers over or focuses the abort button
- **THEN** appropriate visual feedback is provided
- **AND** the button follows VS Code accessibility standards

### Requirement: Webview Automated Testing Framework
The system SHALL provide automated testing capabilities for the chat webview interface using Playwright.

#### Scenario: Playwright test setup
- **WHEN** developers run the test suite  
- **THEN** Playwright loads the chat webview in a test browser environment
- **AND** the webview content is accessible for automated testing

#### Scenario: Mock agent data integration
- **WHEN** tests need to simulate agent behavior
- **THEN** mock data structures matching real Agent SDK interfaces are available
- **AND** different message types (text, tool calls, streaming) can be simulated

### Requirement: Major Smoke Test Coverage
The system SHALL provide essential smoke tests for critical chat interface functionality.

#### Scenario: Basic message flow testing
- **WHEN** a mock message is sent through the interface
- **THEN** the message appears correctly in the chat display
- **AND** the input field clears and remains functional

#### Scenario: Input interaction testing  
- **WHEN** test automation interacts with the input field
- **THEN** text can be entered and the send button triggers message sending
- **AND** proper message events are posted to the VS Code extension

#### Scenario: Basic streaming functionality testing  
- **WHEN** streaming message updates are simulated
- **THEN** a streaming message appears in the chat
- **AND** the abort button becomes visible during streaming

#### Scenario: Critical error handling testing
- **WHEN** a major error condition is simulated
- **THEN** an error message displays in the chat interface
- **AND** the interface remains responsive

### Requirement: Test Data Management  
The system SHALL provide utilities for generating and managing test data based on real agent behavior.

#### Scenario: Agent data structure capture
- **WHEN** developers run the real agent in development mode
- **THEN** actual message data structures are captured and documented
- **AND** these structures inform the creation of accurate mock data

#### Scenario: Test fixture generation
- **WHEN** tests require specific message scenarios
- **THEN** test fixtures provide realistic message data for various use cases
- **AND** fixtures include text messages, tool calls, streaming content, and error states

### Requirement: Third-Party Markdown Library Integration
The system SHALL use the marked library for markdown parsing and DOMPurify library for HTML sanitization.

#### Scenario: Marked library usage for appropriate blocks
- **WHEN** parsing content from text blocks or memory blocks
- **THEN** the system uses marked.parse() method to convert markdown to HTML
- **AND** marked is configured with appropriate options for VS Code webview context

#### Scenario: DOMPurify sanitization
- **WHEN** rendering parsed markdown HTML
- **THEN** the system uses DOMPurify.sanitize() to remove dangerous HTML elements
- **AND** safe formatting elements (headings, lists, code, emphasis) are preserved

#### Scenario: Dependency management
- **WHEN** the extension builds and packages
- **THEN** marked and dompurify libraries are properly bundled with appropriate versions
- **AND** TypeScript types are available for development

### Requirement: Markdown Content Rendering
The system SHALL parse and render markdown syntax in AI assistant message content as formatted HTML instead of plain text.

#### Scenario: Bold and italic text rendering
- **WHEN** AI assistant sends a message containing markdown bold (**text**) or italic (*text*) syntax
- **THEN** the text displays with proper bold or italic formatting in the chat interface
- **AND** the raw markdown syntax is not visible to the user

#### Scenario: Code block rendering
- **WHEN** AI assistant sends a message containing markdown code blocks (```language)
- **THEN** the code displays in a styled code block with monospace font and syntax highlighting preservation
- **AND** the code block has clear visual distinction from regular text

#### Scenario: Inline code rendering  
- **WHEN** AI assistant sends a message containing inline code (`code`)
- **THEN** the inline code displays with monospace font and background highlighting
- **AND** the backtick delimiters are not visible

#### Scenario: Header rendering
- **WHEN** AI assistant sends a message containing markdown headers (# ## ###)
- **THEN** the headers display with appropriate font sizes and styling
- **AND** the hash symbols are not visible in the rendered output

#### Scenario: List rendering
- **WHEN** AI assistant sends a message containing markdown lists (- * or numbered)
- **THEN** the lists display with proper indentation and list markers
- **AND** nested lists maintain proper hierarchy

### Requirement: Content Security for Markdown Rendering  
The system SHALL sanitize rendered markdown HTML to prevent security vulnerabilities while preserving formatting.

#### Scenario: XSS prevention
- **WHEN** markdown content contains potentially dangerous HTML or script tags
- **THEN** the dangerous content is sanitized or removed before rendering
- **AND** safe formatting elements are preserved

#### Scenario: Link handling
- **WHEN** markdown content contains links [text](url)
- **THEN** links are rendered but configured appropriately for the VS Code webview security context
- **AND** external links follow VS Code security policies

### Requirement: Selective Block Type Markdown Rendering
The system SHALL apply markdown parsing only to appropriate block types while preserving existing rendering for other block types, with enhanced tool block compact display.

#### Scenario: Tool block compact rendering
- **WHEN** a message contains tool blocks
- **THEN** tool blocks render in compact format with tool icon, name, and compactParams inline
- **AND** tool block content uses the existing ToolBlock.compactParams field when available
- **AND** tools without compactParams display tool name only
- **AND** compact tool display integrates seamlessly with message flow

### Requirement: React Component Architecture
The webview SHALL use a component-based React architecture with TypeScript for type safety and maintainability.

#### Scenario: Component composition
- **WHEN** the webview is rendered
- **THEN** UI is composed of reusable React components (ChatContainer, MessageList, MessageInput, etc.)
- **AND** each component has proper TypeScript interfaces for props and state

#### Scenario: State management
- **WHEN** webview state changes (messages, streaming status, etc.)  
- **THEN** state updates are managed through React hooks and context
- **AND** all state transitions are type-safe with TypeScript

#### Scenario: Message component types
- **WHEN** different message types are displayed (user, assistant, error, streaming)
- **THEN** each message type has its own React component with typed props
- **AND** message content rendering is properly typed and validated

### Requirement: TypeScript Type Definitions
The webview SHALL define comprehensive TypeScript interfaces for all data structures and component contracts.

#### Scenario: Message type definitions
- **WHEN** handling message data from the extension
- **THEN** message structures are defined with TypeScript interfaces
- **AND** type checking prevents runtime errors from malformed message data

#### Scenario: VS Code API message types
- **WHEN** sending/receiving messages with the VS Code extension
- **THEN** message command types are strictly defined with TypeScript enums/unions
- **AND** message payloads have typed interfaces

#### Scenario: Component prop types
- **WHEN** React components receive props
- **THEN** all props have TypeScript interface definitions
- **AND** prop validation occurs at compile time

### Requirement: React Build Integration
The system SHALL integrate React and TypeScript compilation into the existing webpack build process.

#### Scenario: React compilation
- **WHEN** building the extension
- **THEN** React TSX files are compiled to JavaScript for the webview
- **AND** TypeScript type checking is enforced during build

#### Scenario: Development workflow
- **WHEN** developing webview features
- **THEN** hot reload and development tools work with React components  
- **AND** TypeScript errors are caught during development

#### Scenario: Production build
- **WHEN** packaging the extension for distribution
- **THEN** React components are optimized and bundled efficiently
- **AND** production build maintains all functionality without React development overhead

### Requirement: Session Selector Component
The system SHALL provide a session selector dropdown component in the chat interface header to allow users to browse and restore previous chat sessions.

#### Scenario: Session selector display
- **WHEN** the chat interface loads
- **THEN** a session selector dropdown appears in the left top area of the header
- **AND** the dropdown shows available sessions for the current workspace

#### Scenario: Session list population
- **WHEN** the session selector is opened
- **THEN** the system uses wave-agent-sdk `listSessions` to fetch available SessionMetadata objects
- **AND** sessions are displayed with meaningful identifiers derived from SessionMetadata (lastActiveAt, latestTotalTokens)

#### Scenario: Session selection and restoration
- **WHEN** user selects a different session from the dropdown
- **THEN** the selected session is loaded
- **AND** the chat interface updates to show the restored session's message history
- **AND** the agent context switches to the selected session

#### Scenario: Session loading states
- **WHEN** sessions are being fetched or restored
- **THEN** appropriate loading indicators are shown in the dropdown
- **AND** the interface remains responsive during session operations

### Requirement: Session Data Integration
The system SHALL integrate with wave-agent-sdk session management to provide session operations through the VS Code extension backend using existing SessionMetadata and SessionData types.

#### Scenario: Backend session listing
- **WHEN** the webview requests available sessions
- **THEN** the VS Code extension calls wave-agent-sdk `listSessions` with current workspace directory
- **AND** SessionMetadata array is returned to the webview for display

#### Scenario: Backend session restoration using agent method
- **WHEN** user selects a session to restore
- **THEN** the VS Code extension calls `agent.restoreSession(sessionId)` on the current Agent instance
- **AND** the agent switches to the selected session without destroying or recreating the agent instance
- **AND** the webview receives updated message history from the restored session

#### Scenario: Error handling for session operations
- **WHEN** session listing or restoration fails
- **THEN** appropriate error messages are displayed to the user
- **AND** the interface falls back to current session state

### Requirement: Tool Parameter Compact Display
The system SHALL utilize existing ToolBlock compactParams field for inline tool display while maintaining readability and context.

#### Scenario: compactParams field usage
- **WHEN** a tool block contains the compactParams field
- **THEN** the compactParams string is displayed inline with the tool name
- **AND** the full parameters block is not shown in expanded format
- **AND** compactParams provides essential context about tool operation

#### Scenario: Tool information graceful fallback
- **WHEN** tool blocks do not have compactParams defined
- **THEN** the tool displays with name and icon only
- **AND** tool purpose remains identifiable through tool name
- **AND** display formatting remains consistent across all tool types

#### Scenario: Compact display integration
- **WHEN** displaying tool blocks with compactParams
- **THEN** the format follows "🛠️ {toolName} {compactParams}" pattern
- **AND** display integrates seamlessly with message flow
- **AND** tool information remains accessible and readable
- **AND** no custom parameter processing or abbreviation is performed

### Requirement: Unified Message Visual Design
The system SHALL provide a visually unified message flow that reduces visual clutter while maintaining message readability and accessibility.

#### Scenario: Message container styling removal
- **WHEN** messages are displayed in the chat interface
- **THEN** message containers do not have background colors or borders
- **AND** visual separation between messages is minimized
- **AND** message alignment (user/assistant positioning) is preserved
- **AND** message content remains clearly readable

#### Scenario: Error message visual distinction preservation
- **WHEN** error messages are displayed
- **THEN** error styling is maintained for critical visibility
- **AND** error messages remain visually distinct from regular content
- **AND** error background and border styling is preserved for user safety
- **AND** unified design applies only to non-error message types

#### Scenario: Responsive layout with unified design
- **WHEN** the interface is viewed on different screen sizes
- **THEN** unified message design maintains readability across viewport sizes
- **AND** compact tool displays work properly in narrow layouts
- **AND** message flow remains accessible on mobile and desktop interfaces

