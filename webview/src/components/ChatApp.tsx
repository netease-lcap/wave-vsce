import React, { useEffect, useReducer, useCallback, useRef, useImperativeHandle } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ChatHeader } from './ChatHeader';
import { TaskList } from './TaskList';
import { QueuedMessageList } from './QueuedMessageList';
import { ConfirmationDialog } from './ConfirmationDialog';
import ConfigurationDialog from './ConfigurationDialog';
import type {
  ChatAppProps,
  ChatState,
  ChatAction,
  WebviewMessage,
  Message,
  Task
} from '../types';
import '../styles/ChatApp.css';

const initialState: ChatState = {
  messages: [],
  tasks: [],
  isTaskListVisible: false,
  isTaskListCollapsed: false,
  isQueueCollapsed: false,
  isStreaming: false,
  inputDisabled: false,
  shouldClearInput: false,
  sessions: [],
  currentSession: undefined,
  sessionsLoading: false,
  sessionsError: undefined,
  pendingConfirmations: [],
  queuedMessages: [],
  // Configuration state
  showConfiguration: false,
  configurationData: undefined,
  configurationLoading: false,
  configurationError: undefined,
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
    case 'SET_TASKS':
      return {
        ...state,
        tasks: action.payload,
        // Show task list if there are tasks
        isTaskListVisible: action.payload.length > 0,
        // Auto-expand task list when tasks are first created
        isTaskListCollapsed: state.tasks.length === 0 && action.payload.length > 0 ? false : state.isTaskListCollapsed
      };
    case 'TOGGLE_TASK_LIST_COLLAPSE':
      return {
        ...state,
        isTaskListCollapsed: !state.isTaskListCollapsed
      };
    case 'SET_TASK_LIST_COLLAPSED':
      return {
        ...state,
        isTaskListCollapsed: action.payload
      };
    case 'TOGGLE_QUEUE_COLLAPSE':
      return {
        ...state,
        isQueueCollapsed: !state.isQueueCollapsed
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
      return {
        ...state,
        messages: action.payload.messages,
        tasks: action.payload.tasks || [],
        isTaskListVisible: (action.payload.tasks && action.payload.tasks.length > 0) ? true : false,
        isTaskListCollapsed: action.payload.isTaskListCollapsed !== undefined ? action.payload.isTaskListCollapsed : state.isTaskListCollapsed,
        isStreaming: action.payload.isStreaming !== undefined ? action.payload.isStreaming : state.isStreaming,
        sessions: action.payload.sessions || state.sessions || [],
        currentSession: action.payload.currentSession || state.currentSession,
        configurationData: action.payload.configurationData || state.configurationData,
        pendingConfirmations: action.payload.pendingConfirmations || [],
        queuedMessages: action.payload.queuedMessages || [],
        inputContent: action.payload.inputContent,
        selection: action.payload.selection,
        permissionMode: action.payload.permissionMode || state.permissionMode,
        attachedImages: action.payload.attachedImages || [],
        sessionsLoading: false,
        configurationLoading: false
      };
    case 'UPDATE_SELECTION':
      return {
        ...state,
        selection: action.payload
      };
    case 'SET_QUEUED_MESSAGES':
      return {
        ...state,
        queuedMessages: action.payload
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
        case 'updateTasks':
          dispatch({ type: 'SET_TASKS', payload: message.tasks });
          if (message.isTaskListCollapsed !== undefined) {
            dispatch({ type: 'SET_TASK_LIST_COLLAPSED', payload: message.isTaskListCollapsed });
          }
          break;
        case 'updateSelection':
          dispatch({ type: 'UPDATE_SELECTION', payload: message.selection });
          break;
        case 'updatePermissionMode':
          dispatch({ type: 'SET_PERMISSION_MODE', payload: message.mode });
          break;
        case 'updateQueue':
          dispatch({ type: 'SET_QUEUED_MESSAGES', payload: message.queue });
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
              planContent: message.planContent,
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
          dispatch({
            type: 'SET_INITIAL_STATE',
            payload: {
              messages: message.messages,
              tasks: message.tasks,
              isStreaming: message.isStreaming,
              isTaskListCollapsed: message.isTaskListCollapsed,
              sessions: message.sessions,
              currentSession: message.session,
              configurationData: message.configurationData,
              pendingConfirmations: message.pendingConfirmations || (message.pendingConfirmation ? [message.pendingConfirmation] : []),
              selection: message.selection,
              inputContent: message.inputContent,
              permissionMode: message.permissionMode,
              attachedImages: message.attachedImages,
              queuedMessages: message.queuedMessages
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

  const handleSendMessage = useCallback((text: string, images?: Array<{ data: string; mediaType: string; }>, force: boolean = false) => {
    const trimmedText = text.trim();
    if (!trimmedText && (!images || images.length === 0)) return;

    // Send to extension
    vscode.postMessage({
      command: 'sendMessage',
      text: trimmedText,
      images: images,
      force: force
    });
  }, [vscode]);

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

  const handleDeleteQueuedMessage = useCallback((index: number) => {
    const newQueue = [...state.queuedMessages];
    newQueue.splice(index, 1);
    
    // Update local state
    dispatch({ type: 'SET_QUEUED_MESSAGES', payload: newQueue });
    
    // Notify extension to update its queue
    vscode.postMessage({
      command: 'deleteQueuedMessage',
      index: index
    });
  }, [state.queuedMessages, vscode]);

  const handleSendQueuedMessage = useCallback((index: number) => {
    const qm = state.queuedMessages[index];
    if (!qm) return;

    // Send the queued message immediately (backend will handle priority/abort)
    handleSendMessage(qm.text, qm.images, true);

    // Remove from queue
    handleDeleteQueuedMessage(index);
  }, [state.queuedMessages, handleSendMessage, handleDeleteQueuedMessage]);

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

  const handleToggleTaskList = useCallback(() => {
    dispatch({ type: 'TOGGLE_TASK_LIST_COLLAPSE' });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        handleToggleTaskList();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleTaskList]);

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

  const handleRewindToMessage = useCallback((messageId: string) => {
    if (state.isStreaming) return;
    
    vscode.postMessage({
      command: 'rewindToMessage',
      messageId
    });
  }, [state.isStreaming, vscode]);

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
        queuedMessages={state.queuedMessages}
        streamingMessageIndex={streamingMessageIndex}
        vscode={vscode}
        onDeleteQueuedMessage={handleDeleteQueuedMessage}
        onSendQueuedMessage={handleSendQueuedMessage}
        onRewindToMessage={handleRewindToMessage}
      />

      <div className="input-area-container">
        <TaskList
          tasks={state.tasks}
          isVisible={state.isTaskListVisible}
          isCollapsed={state.isTaskListCollapsed}
          onToggleCollapse={() => dispatch({ type: 'TOGGLE_TASK_LIST_COLLAPSE' })}
        />

        <QueuedMessageList
          queuedMessages={state.queuedMessages}
          isCollapsed={state.isQueueCollapsed}
          onToggleCollapse={() => dispatch({ type: 'TOGGLE_QUEUE_COLLAPSE' })}
          onDelete={handleDeleteQueuedMessage}
          onSend={handleSendQueuedMessage}
        />
        
        <div style={{ display: state.pendingConfirmations.length === 0 ? 'block' : 'none' }}>
          <MessageInput
            ref={messageInputRef}
            onSendMessage={handleSendMessage}
            disabled={state.inputDisabled}
            isStreaming={state.isStreaming}
            onAbortMessage={handleAbortMessage}
            onSendQueuedMessage={state.queuedMessages.length > 0 ? () => handleSendQueuedMessage(0) : undefined}
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
            isTaskListVisible={state.isTaskListVisible && state.tasks.length > 0}
          />
        </div>

        {state.pendingConfirmations.length > 0 && (
          <ConfirmationDialog
            key={state.pendingConfirmations[0].confirmationId}
            data-confirmation-id={state.pendingConfirmations[0].confirmationId}
            confirmation={state.pendingConfirmations[0]}
            onConfirm={handleConfirmation}
            onReject={handleRejection}
          />
        )}
      </div>

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