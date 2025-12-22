/**
 * TypeScript type definitions for the Wave AI Chat webview
 * 
 * This file contains all the interfaces and types used throughout the React webview,
 * providing type safety and better development experience.
 */

// Import message structures and session types from wave-agent-sdk
import type { Message, MessageBlock, TextBlock, ErrorBlock, ToolBlock, SubagentBlock, ImageBlock,MemoryBlock, CompressBlock } from 'wave-agent-sdk';
import type { SessionMetadata, SessionData } from 'wave-agent-sdk';

// Export the agent-sdk types for use in components
export type { Message, MessageBlock, TextBlock, ErrorBlock, ToolBlock, SubagentBlock, ImageBlock,MemoryBlock, CompressBlock, SessionData };

// Extended session metadata that includes first message content
export interface ExtendedSessionMetadata extends SessionMetadata {
  firstMessageContent?: string;
}

// Slash command types
export interface SlashCommand {
  id: string;
  name: string;
  description: string;
}

// File mention types for @ file suggestion feature

/**
 * Represents a file or directory item in the suggestion dropdown
 */
export interface FileItem {
  /** Full absolute path to the file or directory */
  path: string;
  /** Relative path from workspace root */
  relativePath: string;
  /** File or directory name without path */
  name: string;
  /** File extension (without dot) - empty string for directories */
  extension: string;
  /** VS Code file icon class name */
  icon: string;
  /** Flag to distinguish files vs directories */
  isDirectory: boolean;
  /** Flag to identify if this is the upload local files option */
  isUploadOption?: boolean;
  /** Flag to identify if this is a knowledge base option */
  isKnowledgeBaseOption?: boolean;
  /** Knowledge base item type: 'kb', 'folder', 'file' */
  kbType?: 'kb' | 'folder' | 'file';
  /** ID of the knowledge base item */
  kbId?: string | number;
  /** ID of the folder in knowledge base */
  folderId?: string | number;
  /** ID of the file in knowledge base */
  fileId?: string | number;
}

/**
 * State for file mention suggestions
 */
export interface FileSuggestionState {
  /** Whether the file mention dropdown is active */
  isActive: boolean;
  /** Array of file suggestions to display */
  suggestions: FileItem[];
  /** Currently selected suggestion index */
  selectedIndex: number;
  /** Text being typed after @ symbol for filtering */
  filterText: string;
  /** Position for dropdown placement */
  position: { top: number; left: number };
  /** Loading state for API requests */
  isLoading: boolean;
}

// VS Code webview message types

/**
 * Base interface for messages sent between webview and extension
 */
export interface WebviewMessage {
  /** Command identifier */
  command: string;
  /** Additional command parameters */
  [key: string]: any;
}

// File upload related message types

/**
 * File data for upload
 */
export interface UploadFileData {
  /** File name */
  name: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  type: string;
  /** File content as ArrayBuffer */
  data: ArrayBuffer;
}

/**
 * Basic file info for upload request
 */
export interface UploadFileInfo {
  /** File name */
  name: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  type: string;
}

// Component props
export interface ChatAppProps {
  vscode: any;
}

export interface MessageListProps {
  messages: Message[];
  streamingMessageIndex?: number;
  subagentMessages?: Map<string, Message[]>;
}

export interface MessageProps {
  message: Message;
  isStreaming?: boolean;
  subagentMessages?: Map<string, Message[]>;
}

// Image attachment types (uses base64 data directly)
export interface AttachedImage {
  /** Unique identifier for the image (for UI management) */
  id: string;
  /** Base64 data URL (e.g., "data:image/png;base64,iVBORw0...") */
  data: string;
  /** MIME type of the image */
  mimeType: string;
  /** Original filename if available */
  filename?: string;
  /** File size in bytes */
  size?: number;
}

export interface MessageInputProps {
  onSendMessage: (text: string, images?: Array<{ data: string; mediaType: string; }>) => void;
  disabled: boolean;
  isStreaming: boolean;
  onAbortMessage: () => void;
  shouldClearInput?: boolean;
  onInputCleared?: () => void;
  vscode: any;
  // Configuration props
  showConfiguration: boolean;
  configurationData?: ConfigurationData;
  configurationLoading: boolean;
  configurationError?: string;
  onConfigurationOpen: () => void;
  onConfigurationSave: (config: ConfigurationData) => void;
  onConfigurationCancel: () => void;
}

/**
 * Props for the attached images component
 */
export interface AttachedImagesProps {
  images: AttachedImage[];
  onRemove: (imageId: string) => void;
}

/**
 * Props for the file suggestion dropdown component
 */
export interface FileSuggestionDropdownProps {
  suggestions: FileItem[];
  isVisible: boolean;
  selectedIndex: number;
  onSelect: (file: FileItem) => void;
  onClose: () => void;
  position: { top: number; left: number };
  filterText: string;
  isLoading?: boolean;
  hasKnowledgeBase?: boolean;
  isKbNavigationActive?: boolean;
}

export interface ChatHeaderProps {
  onClearChat: () => void;
  onAbortMessage: () => void;
  isStreaming: boolean;
  sessions: ExtendedSessionMetadata[];
  currentSession?: ExtendedSessionMetadata;
  onSessionSelect: (sessionId: string) => void;
  sessionsLoading: boolean;
  sessionsError?: string;
}

// Session selector component props
export interface SessionSelectorProps {
  sessions: ExtendedSessionMetadata[];
  currentSession?: ExtendedSessionMetadata;
  onSessionSelect: (sessionId: string) => void;
  loading: boolean;
  error?: string;
  disabled: boolean;
}

// Chat state management
export interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  inputDisabled: boolean;
  shouldClearInput: boolean;
  sessions: ExtendedSessionMetadata[];
  currentSession?: ExtendedSessionMetadata;
  sessionsLoading: boolean;
  sessionsError?: string;
  pendingConfirmation?: ConfirmationRequest;
  // Configuration state
  showConfiguration: boolean;
  configurationData?: ConfigurationData;
  configurationLoading: boolean;
  configurationError?: string;
  // Subagent state
  subagentMessages: Map<string, Message[]>;
}

export interface ConfirmationRequest {
  confirmationId: string;
  toolName: string;
  confirmationType: string;
  toolInput?: any;
}

export interface ConfirmationDialogProps {
  confirmation: ConfirmationRequest;
  onConfirm: (confirmationId: string) => void;
  onReject: (confirmationId: string) => void;
}

// Configuration management types

/**
 * Configuration data for AI agent settings
 * Maps to VS Code global state
 */
export interface ConfigurationData {
  /** API key for authentication */
  apiKey?: string;
  /** Base URL for API endpoints */
  baseURL?: string;
  /** Primary agent model */
  agentModel?: string;
  /** Fast model for quick responses */
  fastModel?: string;
  /** Backend link for @ mention integration and other services */
  backendLink?: string;
}

/**
 * Props for the configuration button component
 */
export interface ConfigurationButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

/**
 * Props for the configuration dialog component
 */
export interface ConfigurationDialogProps {
  isVisible: boolean;
  configurationData: ConfigurationData;
  isLoading: boolean;
  error?: string;
  onSave: (config: ConfigurationData) => void;
  onCancel: () => void;
  position: { top: number; left: number };
}

export type ChatAction =
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'START_STREAMING' }
  | { type: 'END_STREAMING' }
  | { type: 'SET_INPUT_DISABLED'; payload: boolean }
  | { type: 'INPUT_CLEARED' }
  | { type: 'SET_SESSIONS'; payload: ExtendedSessionMetadata[] }
  | { type: 'SET_CURRENT_SESSION'; payload: ExtendedSessionMetadata | undefined }
  | { type: 'SET_SESSIONS_LOADING'; payload: boolean }
  | { type: 'SET_SESSIONS_ERROR'; payload: string | undefined }
  | { type: 'SHOW_CONFIRMATION'; payload: ConfirmationRequest }
  | { type: 'HIDE_CONFIRMATION' }
  | { type: 'SHOW_CONFIGURATION'; payload: ConfigurationData }
  | { type: 'HIDE_CONFIGURATION'; payload?: ConfigurationData }
  | { type: 'SET_CONFIGURATION_LOADING'; payload: boolean }
  | { type: 'SET_CONFIGURATION_ERROR'; payload: string | undefined }
  | { type: 'SET_CONFIGURATION_DATA'; payload: ConfigurationData }
  | { type: 'UPDATE_SUBAGENT_MESSAGES'; payload: { subagentId: string; messages: Message[] } };
