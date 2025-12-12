import React, { useEffect, useReducer, useCallback, useRef, useImperativeHandle } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ChatHeader } from './ChatHeader';
import { ConfirmationDialog } from './ConfirmationDialog';
import type {
  ChatAppProps,
  ChatState,
  ChatAction,
  WebviewMessage,
  Message
} from '../types';
import '../styles/ChatApp.css';

const initialState: ChatState = {
  messages: [],
  isStreaming: false,
  inputDisabled: false,
  shouldClearInput: false,
  sessions: [],
  currentSession: undefined,
  sessionsLoading: false,
  sessionsError: undefined,
  pendingConfirmation: undefined,
  // Configuration state
  showConfiguration: false,
  configurationData: undefined,
  configurationLoading: false,
  configurationError: undefined,
  // Subagent state
  subagentMessages: new Map()
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_MESSAGES':
      return {
        ...state,
        messages: action.payload
      };
    case 'START_STREAMING':
      return {
        ...state,
        isStreaming: true
      };
    case 'END_STREAMING':
      return {
        ...state,
        isStreaming: false
      };
    case 'SET_INPUT_DISABLED':
      return {
        ...state,
        inputDisabled: action.payload
      };
    case 'INPUT_CLEARED':
      return {
        ...state,
        shouldClearInput: false
      };
    case 'SET_SESSIONS':
      return {
        ...state,
        sessions: action.payload,
        sessionsLoading: false,
        sessionsError: undefined
      };
    case 'SET_CURRENT_SESSION':
      return {
        ...state,
        currentSession: action.payload
      };
    case 'SET_SESSIONS_LOADING':
      return {
        ...state,
        sessionsLoading: action.payload
      };
    case 'SET_SESSIONS_ERROR':
      return {
        ...state,
        sessionsError: action.payload,
        sessionsLoading: false
      };
    case 'SHOW_CONFIRMATION':
      return {
        ...state,
        pendingConfirmation: action.payload
      };
    case 'HIDE_CONFIRMATION':
      return {
        ...state,
        pendingConfirmation: undefined
      };
    case 'SHOW_CONFIGURATION':
      return {
        ...state,
        showConfiguration: true,
        configurationData: action.payload,
        configurationLoading: false,
        configurationError: undefined
      };
    case 'HIDE_CONFIGURATION':
      return {
        ...state,
        showConfiguration: false,
        configurationError: undefined
      };
    case 'SET_CONFIGURATION_LOADING':
      return {
        ...state,
        configurationLoading: action.payload
      };
    case 'SET_CONFIGURATION_ERROR':
      return {
        ...state,
        configurationError: action.payload,
        configurationLoading: false
      };
    case 'UPDATE_SUBAGENT_MESSAGES':
      const newSubagentMessages = new Map(state.subagentMessages);
      newSubagentMessages.set(action.payload.subagentId, action.payload.messages);
      return {
        ...state,
        subagentMessages: newSubagentMessages
      };
    default:
      return state;
  }
}

export const ChatApp: React.FC<ChatAppProps> = ({ vscode }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const messageInputRef = useRef<{ focus: () => void }>(null);

  // Handle messages from VS Code extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message: WebviewMessage = event.data;

      switch (message.command) {
        case 'updateMessages':
          dispatch({ type: 'SET_MESSAGES', payload: message.messages });
          break;
        case 'updateSubagentMessages':
          dispatch({
            type: 'UPDATE_SUBAGENT_MESSAGES',
            payload: {
              subagentId: message.subagentId,
              messages: message.messages
            }
          });
          break;
        // Test-only handlers 
        case 'startStreaming':
          dispatch({ type: 'START_STREAMING' });
          break;
        case 'endStreaming':
          dispatch({ type: 'END_STREAMING' });
          break;
        case 'ensureUIReset':
          dispatch({ type: 'END_STREAMING' });
          break;
        case 'updateSessions':
          dispatch({ type: 'SET_SESSIONS', payload: message.sessions });
          break;
        case 'updateCurrentSession':
          dispatch({ type: 'SET_CURRENT_SESSION', payload: message.session });
          break;
        case 'sessionsError':
          dispatch({ type: 'SET_SESSIONS_ERROR', payload: message.error });
          break;
        case 'showConfirmation':
          dispatch({
            type: 'SHOW_CONFIRMATION',
            payload: {
              confirmationId: message.confirmationId,
              toolName: message.toolName,
              confirmationType: message.confirmationType,
              toolInput: message.toolInput
            }
          });
          break;
        case 'configurationResponse':
          dispatch({
            type: 'SHOW_CONFIGURATION',
            payload: message.configurationData
          });
          break;
        case 'configurationUpdated':
          dispatch({ type: 'HIDE_CONFIGURATION' });
          break;
        case 'configurationError':
          dispatch({ type: 'SET_CONFIGURATION_ERROR', payload: message.error });
          break;
        case 'focusInput':
          // Focus the message input
          if (messageInputRef.current && typeof messageInputRef.current.focus === 'function') {
            messageInputRef.current.focus();
          }
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleSendMessage = useCallback((text: string, images?: Array<{ data: string; mediaType: string; }>) => {
    if (state.isStreaming || (!text.trim() && (!images || images.length === 0))) return;

    // Add user message to display immediately
    const userMessage: Message = {
      role: 'user',
      blocks: [{ type: 'text', content: text.trim() }]
    };
    
    dispatch({ 
      type: 'SET_MESSAGES', 
      payload: [...state.messages, userMessage] 
    });

    // Send to extension
    vscode.postMessage({
      command: 'sendMessage',
      text: text.trim(),
      images: images
    });
  }, [state.messages, state.isStreaming, vscode]);

  const handleClearChat = useCallback(() => {
    if (state.isStreaming) return;
    
    vscode.postMessage({
      command: 'clearChat'
    });
  }, [state.isStreaming, vscode]);

  const handleAbortMessage = useCallback(() => {
    if (!state.isStreaming) return;
    
    vscode.postMessage({
      command: 'abortMessage'
    });
  }, [state.isStreaming, vscode]);

  // Configuration handlers
  const handleConfigurationOpen = useCallback(() => {
    vscode.postMessage({
      command: 'getConfiguration'
    });
  }, [vscode]);

  const handleConfigurationSave = useCallback((configData: any) => {
    dispatch({ type: 'SET_CONFIGURATION_LOADING', payload: true });
    vscode.postMessage({
      command: 'updateConfiguration',
      configurationData: configData
    });
  }, [vscode]);

  const handleConfigurationCancel = useCallback(() => {
    dispatch({ type: 'HIDE_CONFIGURATION' });
  }, []);

  // Simple streaming message detection
  const streamingMessageIndex = state.isStreaming && state.messages.length > 0 
    ? state.messages.length - 1 
    : undefined;

  // Initialize webview and load sessions on component mount
  useEffect(() => {
    dispatch({ type: 'SET_SESSIONS_LOADING', payload: true });
    vscode.postMessage({
      command: 'webviewReady'
    });
  }, [vscode]);

  const handleSessionSelect = useCallback((sessionId: string) => {
    if (state.isStreaming) return;
    
    vscode.postMessage({
      command: 'restoreSession',
      sessionId
    });
  }, [state.isStreaming, vscode]);

  const handleInputCleared = useCallback(() => {
    dispatch({ type: 'INPUT_CLEARED' });
  }, []);

  const handleConfirmation = useCallback((confirmationId: string) => {
    vscode.postMessage({
      command: 'confirmationResponse',
      confirmationId,
      approved: true
    });
    dispatch({ type: 'HIDE_CONFIRMATION' });
  }, [vscode]);

  const handleRejection = useCallback((confirmationId: string) => {
    vscode.postMessage({
      command: 'confirmationResponse',
      confirmationId,
      approved: false
    });
    dispatch({ type: 'HIDE_CONFIRMATION' });
  }, [vscode]);

  return (
    <div className="chat-container" data-testid="chat-container">
      <ChatHeader
        onClearChat={handleClearChat}
        onAbortMessage={handleAbortMessage}
        isStreaming={state.isStreaming}
        sessions={state.sessions}
        currentSession={state.currentSession}
        onSessionSelect={handleSessionSelect}
        sessionsLoading={state.sessionsLoading}
        sessionsError={state.sessionsError}
      />
      
      <MessageList 
        messages={state.messages} 
        streamingMessageIndex={streamingMessageIndex}
        subagentMessages={state.subagentMessages}
      />
      
      {!state.pendingConfirmation && (
        <MessageInput
          ref={messageInputRef}
          onSendMessage={handleSendMessage}
          disabled={state.inputDisabled}
          isStreaming={state.isStreaming}
          onAbortMessage={handleAbortMessage}
          shouldClearInput={state.shouldClearInput}
          onInputCleared={handleInputCleared}
          vscode={vscode}
          showConfiguration={state.showConfiguration}
          configurationData={state.configurationData}
          configurationLoading={state.configurationLoading}
          configurationError={state.configurationError}
          onConfigurationOpen={handleConfigurationOpen}
          onConfigurationSave={handleConfigurationSave}
          onConfigurationCancel={handleConfigurationCancel}
        />
      )}

      {state.pendingConfirmation && (
        <ConfirmationDialog
          confirmation={state.pendingConfirmation}
          onConfirm={handleConfirmation}
          onReject={handleRejection}
        />
      )}
    </div>
  );
};