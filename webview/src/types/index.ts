/**
 * TypeScript type definitions for the Wave AI Chat webview
 * 
 * This file contains all the interfaces and types used throughout the React webview,
 * providing type safety and better development experience.
 */

// Import message structures and session types from wave-agent-sdk
import type { Message, MessageBlock, TextBlock, ErrorBlock, ToolBlock } from 'wave-agent-sdk';
import type { SessionMetadata, SessionData } from 'wave-agent-sdk';

// Export the agent-sdk types for use in components
export type { Message, MessageBlock, TextBlock, ErrorBlock, ToolBlock, SessionMetadata, SessionData };

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

// Component props
export interface ChatAppProps {
  vscode: any;
}

export interface MessageListProps {
  messages: Message[];
  streamingMessageIndex?: number;
}

export interface MessageProps {
  message: Message;
  isStreaming?: boolean;
}

export interface MessageInputProps {
  onSendMessage: (text: string) => void;
  disabled: boolean;
  isStreaming: boolean;
  onAbortMessage: () => void;
  shouldClearInput?: boolean;
  onInputCleared?: () => void;
}

export interface ChatHeaderProps {
  onClearChat: () => void;
  onAbortMessage: () => void;
  isStreaming: boolean;
  sessions: SessionMetadata[];
  currentSession?: SessionMetadata;
  onSessionSelect: (sessionId: string) => void;
  sessionsLoading: boolean;
  sessionsError?: string;
}

// Session selector component props
export interface SessionSelectorProps {
  sessions: SessionMetadata[];
  currentSession?: SessionMetadata;
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
  sessions: SessionMetadata[];
  currentSession?: SessionMetadata;
  sessionsLoading: boolean;
  sessionsError?: string;
}

export type ChatAction = 
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'START_STREAMING' }
  | { type: 'END_STREAMING' }
  | { type: 'SET_INPUT_DISABLED'; payload: boolean }
  | { type: 'INPUT_CLEARED' }
  | { type: 'SET_SESSIONS'; payload: SessionMetadata[] }
  | { type: 'SET_CURRENT_SESSION'; payload: SessionMetadata | undefined }
  | { type: 'SET_SESSIONS_LOADING'; payload: boolean }
  | { type: 'SET_SESSIONS_ERROR'; payload: string | undefined };