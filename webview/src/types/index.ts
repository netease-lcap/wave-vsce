/**
 * TypeScript type definitions for the Wave AI Chat webview
 * 
 * This file contains all the interfaces and types used throughout the React webview,
 * providing type safety and better development experience.
 */

// Import message structures from wave-agent-sdk
import type { Message, MessageBlock, TextBlock, ErrorBlock, ToolBlock } from 'wave-agent-sdk';

// Export the agent-sdk types for use in components
export type { Message, MessageBlock, TextBlock, ErrorBlock, ToolBlock };

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
  onAnalyzeWorkspace: () => void;
  onAbortMessage: () => void;
  isStreaming: boolean;
}

// Chat state management
export interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  inputDisabled: boolean;
  shouldClearInput: boolean;
}

export type ChatAction = 
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'START_STREAMING' }
  | { type: 'END_STREAMING' }
  | { type: 'SET_INPUT_DISABLED'; payload: boolean }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'INPUT_CLEARED' };