/**
 * TypeScript type definitions for the Wave AI Chat webview
 * 
 * This file contains webview-specific interfaces and types,
 * while shared types are imported from @wave-code-chat/shared-types
 */

// Import shared types
import type {
  Message, MessageBlock, TextBlock, ErrorBlock, ToolBlock, SubagentBlock, ImageBlock,
  SessionData, ExtendedSessionMetadata, WebviewMessage, UploadFileData, UploadFileInfo,
  FileItem, ConfigurationData, ConfirmationRequest, AttachedImage
} from '@wave-code-chat/shared-types';

// Re-export shared types for convenience
export {
  Message, MessageBlock, TextBlock, ErrorBlock, ToolBlock, SubagentBlock, ImageBlock,
  SessionData, ExtendedSessionMetadata, WebviewMessage, UploadFileData, UploadFileInfo,
  FileItem, ConfigurationData, ConfirmationRequest, AttachedImage
};

// Slash command types
export interface SlashCommand {
  id: string;
  name: string;
  description: string;
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

export interface ConfirmationDialogProps {
  confirmation: ConfirmationRequest;
  onConfirm: (confirmationId: string) => void;
  onReject: (confirmationId: string) => void;
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
  | { type: 'HIDE_CONFIGURATION' }
  | { type: 'SET_CONFIGURATION_LOADING'; payload: boolean }
  | { type: 'SET_CONFIGURATION_ERROR'; payload: string | undefined }
  | { type: 'UPDATE_SUBAGENT_MESSAGES'; payload: { subagentId: string; messages: Message[] } };