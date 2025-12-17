/**
 * Shared TypeScript types for Wave VSCode Chat Extension
 * 
 * This package contains types that are shared between the VS Code extension backend
 * and the React webview frontend.
 */

import type { 
  Message, 
  MessageBlock, 
  TextBlock, 
  ErrorBlock, 
  ToolBlock, 
  SubagentBlock, 
  ImageBlock,
  SessionMetadata,
  SessionData 
} from 'wave-agent-sdk';

// Re-export wave-agent-sdk types for convenience
export type { 
  Message, 
  MessageBlock, 
  TextBlock, 
  ErrorBlock, 
  ToolBlock, 
  SubagentBlock, 
  ImageBlock,
  SessionMetadata,
  SessionData 
};

// Extended session metadata that includes first message content
export interface ExtendedSessionMetadata extends SessionMetadata {
  firstMessageContent?: string;
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
}

// Configuration management types

/**
 * Configuration data for AI agent settings
 * Maps to environment variables in ~/.wave/settings.json
 */
export interface ConfigurationData {
  /** API key for authentication -> env.AIGW_TOKEN */
  apiKey?: string;
  /** Base URL for API endpoints -> env.AIGW_URL */
  baseURL?: string;
  /** Primary agent model -> env.AIGW_MODEL */
  agentModel?: string;
  /** Fast model for quick responses -> env.AIGW_FAST_MODEL */
  fastModel?: string;
}

// Confirmation dialog types

export interface ConfirmationRequest {
  confirmationId: string;
  toolName: string;
  confirmationType: string;
  toolInput?: any;
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