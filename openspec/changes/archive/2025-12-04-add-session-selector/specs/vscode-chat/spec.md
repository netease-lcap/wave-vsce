## ADDED Requirements

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

#### Scenario: Backend session restoration
- **WHEN** user selects a session to restore
- **THEN** the current Agent instance is properly destroyed via agent.destroy()
- **AND** the VS Code extension creates a new Agent instance with the selected SessionMetadata.id as restoreSessionId
- **AND** the webview receives updated message history from the restored SessionData

#### Scenario: Error handling for session operations
- **WHEN** session listing or restoration fails
- **THEN** appropriate error messages are displayed to the user
- **AND** the interface falls back to current session state

## MODIFIED Requirements

### Requirement: Chat Interface
The system SHALL provide a React and TypeScript-based webview chat interface for AI interaction with strong type safety and component-based architecture, including session management capabilities.

#### Scenario: Open chat interface
- **WHEN** user executes the "Open AI Chat" command
- **THEN** a webview panel opens with the React-based chat interface
- **AND** all UI components are type-safe with TypeScript
- **AND** the session selector is prominently displayed in the header

#### Scenario: Message display
- **WHEN** messages exist in the chat history
- **THEN** all messages are displayed in chronological order with proper formatting
- **AND** message rendering is handled by React components with proper type definitions

#### Scenario: Message input
- **WHEN** user types in the input field and presses Enter
- **THEN** the message is sent to the AI agent for the currently selected session
- **AND** input handling is managed by React state with TypeScript type safety

#### Scenario: Streaming message display
- **WHEN** AI generates streaming responses
- **THEN** streaming content updates are handled by React state management
- **AND** streaming UI states are type-safe and properly managed
- **AND** session switching is disabled during streaming operations

#### Scenario: Tool execution display  
- **WHEN** AI executes tools during message generation
- **THEN** tool status updates are displayed using React components
- **AND** tool block rendering follows typed interfaces

#### Scenario: Error message display
- **WHEN** errors occur during AI interaction or session operations
- **THEN** error messages are displayed using dedicated React error components
- **AND** error states are properly typed and handled

#### Scenario: Abort functionality
- **WHEN** user aborts message generation
- **THEN** React state properly manages abort UI transitions
- **AND** partial content preservation follows typed message structures