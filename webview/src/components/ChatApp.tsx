import React, { useEffect, useReducer, useCallback } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ChatHeader } from './ChatHeader';
import type { 
  ChatAppProps, 
  ChatState, 
  ChatAction, 
  WebviewMessage,
  Message
} from '../types';

const initialState: ChatState = {
  messages: [],
  isStreaming: false,
  inputDisabled: false,
  shouldClearInput: false
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_MESSAGES':
      // Check if the latest message contains an error block, which should end streaming
      const latestMessage = action.payload[action.payload.length - 1];
      const hasErrorBlock = latestMessage?.blocks?.some(block => block.type === 'error');
      
      return {
        ...state,
        messages: action.payload,
        // End streaming if there's an error, otherwise preserve streaming state
        isStreaming: hasErrorBlock ? false : state.isStreaming,
        // Re-enable input when messages are updated, unless we're actively streaming (and no error)
        inputDisabled: hasErrorBlock ? false : state.isStreaming
      };
    case 'START_STREAMING':
      return {
        ...state,
        isStreaming: true,
        inputDisabled: true
      };
    case 'END_STREAMING':
      return {
        ...state,
        isStreaming: false,
        inputDisabled: false
      };
    case 'SET_INPUT_DISABLED':
      return {
        ...state,
        inputDisabled: action.payload
      };
    case 'CLEAR_MESSAGES':
      return {
        ...initialState,
        shouldClearInput: true
      };
    case 'INPUT_CLEARED':
      return {
        ...state,
        shouldClearInput: false
      };
    default:
      return state;
  }
}

export const ChatApp: React.FC<ChatAppProps> = ({ vscode }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // Handle messages from VS Code extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message: WebviewMessage = event.data;

      switch (message.command) {
        case 'updateMessages':
          dispatch({ type: 'SET_MESSAGES', payload: message.messages });
          break;
        case 'clearMessages':
          dispatch({ type: 'CLEAR_MESSAGES' });
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
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleSendMessage = useCallback((text: string) => {
    if (state.isStreaming || !text.trim()) return;

    // Add user message to display immediately
    const userMessage: Message = {
      role: 'user',
      blocks: [{ type: 'text', content: text.trim() }]
    };
    
    dispatch({ 
      type: 'SET_MESSAGES', 
      payload: [...state.messages, userMessage] 
    });
    dispatch({ type: 'SET_INPUT_DISABLED', payload: true });

    // Send to extension
    vscode.postMessage({
      command: 'sendMessage',
      text: text.trim()
    });
  }, [state.messages, state.isStreaming, vscode]);

  const handleClearChat = useCallback(() => {
    if (state.isStreaming) return;
    
    vscode.postMessage({
      command: 'clearChat'
    });
  }, [state.isStreaming, vscode]);

  const handleAnalyzeWorkspace = useCallback(() => {
    if (state.isStreaming) return;
    
    vscode.postMessage({
      command: 'getWorkspaceInfo'
    });
  }, [state.isStreaming, vscode]);

  const handleAbortMessage = useCallback(() => {
    if (!state.isStreaming) return;
    
    vscode.postMessage({
      command: 'abortMessage'
    });
  }, [state.isStreaming, vscode]);

  // Simple streaming message detection
  const streamingMessageIndex = state.isStreaming && state.messages.length > 0 
    ? state.messages.length - 1 
    : undefined;

  const handleInputCleared = useCallback(() => {
    dispatch({ type: 'INPUT_CLEARED' });
  }, []);

  return (
    <div className="chat-container" data-testid="chat-container">
      <ChatHeader
        onClearChat={handleClearChat}
        onAnalyzeWorkspace={handleAnalyzeWorkspace}
        onAbortMessage={handleAbortMessage}
        isStreaming={state.isStreaming}
      />
      
      <MessageList 
        messages={state.messages} 
        streamingMessageIndex={streamingMessageIndex}
      />
      
      <MessageInput
        onSendMessage={handleSendMessage}
        disabled={state.inputDisabled}
        isStreaming={state.isStreaming}
        onAbortMessage={handleAbortMessage}
        shouldClearInput={state.shouldClearInput}
        onInputCleared={handleInputCleared}
      />
    </div>
  );
};