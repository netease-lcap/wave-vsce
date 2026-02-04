import React, { useEffect, useReducer, useCallback, useRef, useImperativeHandle } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ChatHeader } from './ChatHeader';
import { ConfirmationDialog } from './ConfirmationDialog';
import ConfigurationDialog from './ConfigurationDialog';
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
  pendingConfirmations: [],
  // Configuration state
  showConfiguration: false,
  configurationData: undefined,
  configurationLoading: false,
  configurationError: undefined,
  // Subagent state
  subagentMessages: new Map(),
  // Permission mode state
  permissionMode: 'default',
  // Attached images state
  attachedImages: []
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
        pendingConfirmations: [...state.pendingConfirmations, action.payload]
      };
    case 'HIDE_CONFIRMATION':
      return {
        ...state,
        pendingConfirmations: state.pendingConfirmations.filter(c => c.confirmationId !== action.payload)
      };
    case 'SHOW_CONFIGURATION':
      return {
        ...state,
        showConfiguration: true,
        configurationData: action.payload.data,
        configurationLoading: false,
        configurationError: action.payload.error
      };
	    case 'HIDE_CONFIGURATION':
	      return {
	        ...state,
	        showConfiguration: false,
	        configurationData: action.payload || state.configurationData,
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
    case 'SET_CONFIGURATION_DATA':
      return {
        ...state,
        configurationData: action.payload,
        configurationLoading: false
      };
    case 'SET_INITIAL_STATE':
      const subagentMessagesMap = new Map<string, Message[]>();
      if (action.payload.subagentMessages) {
        Object.entries(action.payload.subagentMessages).forEach(([id, msgs]) => {
          subagentMessagesMap.set(id, msgs);
        });
      }
      return {
        ...state,
        messages: action.payload.messages,
        isStreaming: action.payload.isStreaming !== undefined ? action.payload.isStreaming : state.isStreaming,
        sessions: action.payload.sessions || state.sessions || [],
        currentSession: action.payload.currentSession || state.currentSession,
        configurationData: action.payload.configurationData || state.configurationData,
        pendingConfirmations: action.payload.pendingConfirmations || [],
        subagentMessages: subagentMessagesMap,
        inputContent: action.payload.inputContent,
        selection: action.payload.selection,
        permissionMode: action.payload.permissionMode || state.permissionMode,
        attachedImages: action.payload.attachedImages || [],
        sessionsLoading: false,
        configurationLoading: false
      };
    case 'UPDATE_SUBAGENT_MESSAGES':
      const newSubagentMessages = new Map(state.subagentMessages);
      newSubagentMessages.set(action.payload.subagentId, action.payload.messages);
      return {
        ...state,
        subagentMessages: newSubagentMessages
      };
    case 'UPDATE_SELECTION':
      return {
        ...state,
        selection: action.payload
      };
    case 'SET_PERMISSION_MODE':
      return {
        ...state,
        permissionMode: action.payload
      };
    default:
      return state;
  }
}

export const ChatApp: React.FC<ChatAppProps> = ({ vscode }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const messageInputRef = useRef<{ focus: () => void }>(null);
  const stateRef = useRef(state);

  // Keep stateRef in sync with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Handle messages from VS Code extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message: WebviewMessage = event.data;

      switch (message.command) {
        case 'updateMessages':
          dispatch({ type: 'SET_MESSAGES', payload: message.messages });
          break;
        case 'updateSelection':
          dispatch({ type: 'UPDATE_SELECTION', payload: message.selection });
          break;
        case 'updatePermissionMode':
          dispatch({ type: 'SET_PERMISSION_MODE', payload: message.mode });
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
              toolInput: message.toolInput,
              suggestedPrefix: message.suggestedPrefix,
              hidePersistentOption: message.hidePersistentOption
            }
          });
          break;
        case 'configurationResponse':
          dispatch({
            type: 'SET_CONFIGURATION_DATA',
            payload: message.configurationData
          });
          break;
        case 'setInitialState':
          console.log('Received setInitialState:', message);
          dispatch({
            type: 'SET_INITIAL_STATE',
            payload: {
              messages: message.messages,
              isStreaming: message.isStreaming,
              sessions: message.sessions,
              currentSession: message.session,
              configurationData: message.configurationData,
              pendingConfirmations: message.pendingConfirmations || (message.pendingConfirmation ? [message.pendingConfirmation] : []),
              selection: message.selection,
              subagentMessages: message.subagentMessages,
              inputContent: message.inputContent,
              permissionMode: message.permissionMode,
              attachedImages: message.attachedImages
            }
          });
          break;
        case 'showConfiguration':
          dispatch({
            type: 'SHOW_CONFIGURATION',
            payload: {
              data: message.configurationData || stateRef.current.configurationData || {},
              error: message.error
            }
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

  const handleSendMessage = useCallback((text: string, images?: Array<{ data: string; mediaType: string; }>, selection?: any) => {
    const trimmedText = text.trim();
    if (state.isStreaming || (!trimmedText && (!images || images.length === 0))) return;

    // Send to extension
    vscode.postMessage({
      command: 'sendMessage',
      text: trimmedText,
      images: images,
      selection: selection
    });
  }, [state.isStreaming, vscode]);

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
    dispatch({ 
      type: 'SHOW_CONFIGURATION', 
      payload: { data: state.configurationData || {} } 
    });
    vscode.postMessage({
      command: 'getConfiguration'
    });
  }, [vscode, state.configurationData]);

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

  const handleConfirmation = useCallback((confirmationId: string, decision?: any) => {
    vscode.postMessage({
      command: 'confirmationResponse',
      confirmationId,
      approved: true,
      decision
    });
    dispatch({ type: 'HIDE_CONFIRMATION', payload: confirmationId });
  }, [vscode]);

  const handleRejection = useCallback((confirmationId: string) => {
    vscode.postMessage({
      command: 'confirmationResponse',
      confirmationId,
      approved: false
    });
    dispatch({ type: 'HIDE_CONFIRMATION', payload: confirmationId });
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
        vscode={vscode}
      />
      
      {state.pendingConfirmations.length === 0 && (
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
          selection={state.selection}
          inputContent={state.inputContent}
          permissionMode={state.permissionMode}
          initialAttachedImages={state.attachedImages}
        />
      )}

      {state.pendingConfirmations.length > 0 && (
        <ConfirmationDialog
          key={state.pendingConfirmations[0].confirmationId}
          data-confirmation-id={state.pendingConfirmations[0].confirmationId}
          confirmation={state.pendingConfirmations[0]}
          onConfirm={handleConfirmation}
          onReject={handleRejection}
        />
      )}

      <ConfigurationDialog
        isVisible={state.showConfiguration}
        configurationData={state.configurationData || {}}
        isLoading={state.configurationLoading}
        error={state.configurationError}
        onSave={handleConfigurationSave}
        onCancel={handleConfigurationCancel}
        vscode={vscode}
      />
    </div>
  );
};