import React, { useState, useCallback, KeyboardEvent, useEffect, useRef } from 'react';
import type { MessageInputProps, FileItem, ConfigurationData } from '../types';
import { FileSuggestionDropdown } from './FileSuggestionDropdown';
import ConfigurationButton from './ConfigurationButton';
import ConfigurationDialog from './ConfigurationDialog';

interface AtMentionState {
  isActive: boolean;
  filterText: string;
  startPos: number;
  endPos: number;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  disabled,
  isStreaming,
  onAbortMessage,
  shouldClearInput,
  onInputCleared,
  vscode,
  showConfiguration,
  configurationData,
  configurationLoading,
  configurationError,
  onConfigurationOpen,
  onConfigurationSave,
  onConfigurationCancel
}) => {
  const [message, setMessage] = useState('');
  const [atMention, setAtMention] = useState<AtMentionState>({
    isActive: false,
    filterText: '',
    startPos: 0,
    endPos: 0
  });
  const [suggestions, setSuggestions] = useState<FileItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [configDialogPosition, setConfigDialogPosition] = useState({ top: 0, left: 0 });
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const configButtonRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef<string>('');

  // Handle input clearing when requested by parent
  useEffect(() => {
    if (shouldClearInput) {
      setMessage('');
      closeDropdown();
      onInputCleared?.();
    }
  }, [shouldClearInput, onInputCleared]);

  // Close dropdown helper
  const closeDropdown = useCallback(() => {
    setAtMention({ isActive: false, filterText: '', startPos: 0, endPos: 0 });
    setSuggestions([]);
    setSelectedIndex(0);
    setIsLoadingSuggestions(false);
  }, []);

  // Detect @ mention in text
  const detectAtMention = useCallback((text: string, cursorPos: number): AtMentionState => {
    // Find the last @ symbol before cursor position
    let atPos = -1;
    for (let i = cursorPos - 1; i >= 0; i--) {
      if (text[i] === '@') {
        atPos = i;
        break;
      }
      // Stop if we hit whitespace or newline
      if (text[i] === ' ' || text[i] === '\n') {
        break;
      }
    }

    if (atPos === -1) {
      return { isActive: false, filterText: '', startPos: 0, endPos: 0 };
    }

    // Check if @ is at start of line or preceded by whitespace
    const isValidPosition = atPos === 0 || /\s/.test(text[atPos - 1]);
    if (!isValidPosition) {
      return { isActive: false, filterText: '', startPos: 0, endPos: 0 };
    }

    // Extract filter text after @
    const afterAt = text.slice(atPos + 1, cursorPos);

    // Check if filter text contains invalid characters
    if (/\s/.test(afterAt)) {
      return { isActive: false, filterText: '', startPos: 0, endPos: 0 };
    }

    return {
      isActive: true,
      filterText: afterAt,
      startPos: atPos,
      endPos: cursorPos
    };
  }, []);

  // Calculate dropdown position based on cursor
  const calculateDropdownPosition = useCallback(() => {
    if (!textareaRef.current) return { top: 0, left: 0 };

    const textarea = textareaRef.current;

    // Position at textarea top - CSS transform will move it up by dropdown height
    // This ensures the dropdown appears above the input with proper spacing
    return {
      top: textarea.offsetTop,
      left: textarea.offsetLeft
    };
  }, []);

  // Request file suggestions from extension
  const requestFileSuggestions = useCallback((filterText: string) => {
    const requestId = Date.now().toString();
    requestIdRef.current = requestId;
    setIsLoadingSuggestions(true);

    vscode.postMessage({
      command: 'requestFileSuggestions',
      filterText: filterText,
      requestId: requestId
    });
  }, []);

  // Debounced file suggestion requests
  useEffect(() => {
    if (atMention.isActive) {
      const timer = setTimeout(() => {
        requestFileSuggestions(atMention.filterText);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setSuggestions([]);
      setIsLoadingSuggestions(false);
    }
  }, [atMention.isActive, atMention.filterText, requestFileSuggestions]);

  // Listen for file suggestions response from extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      if (message.command === 'fileSuggestionsResponse') {
        // Only process if this is the latest request
        if (message.requestId === requestIdRef.current) {
          setSuggestions(message.suggestions || []);
          setSelectedIndex(0);
          setIsLoadingSuggestions(false);
        }
      } else if (message.command === 'fileSuggestionsError') {
        if (message.requestId === requestIdRef.current) {
          setSuggestions([]);
          setIsLoadingSuggestions(false);
          console.error('File suggestions error:', message.error);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((file: FileItem) => {
    if (!textareaRef.current) return;

    const newMessage = message.slice(0, atMention.startPos) +
                      file.relativePath +
                      message.slice(atMention.endPos);

    setMessage(newMessage);
    closeDropdown();

    // Focus back to textarea and set cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = atMention.startPos + file.relativePath.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  }, [message, atMention.startPos, atMention.endPos, closeDropdown]);

  const handleSend = useCallback(() => {
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage('');
      closeDropdown();
    }
  }, [message, disabled, onSendMessage, closeDropdown]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle dropdown navigation
    if (atMention.isActive && suggestions.length > 0) {
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex(prev => Math.max(0, prev - 1));
          return;
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev => Math.min(suggestions.length - 1, prev + 1));
          return;
        case 'Enter':
          event.preventDefault();
          if (suggestions[selectedIndex]) {
            handleFileSelect(suggestions[selectedIndex]);
          }
          return;
        case 'Escape':
          event.preventDefault();
          closeDropdown();
          return;
      }
    }

    // Normal behavior for Enter key
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }, [atMention.isActive, suggestions, selectedIndex, handleFileSelect, closeDropdown, handleSend]);

  const handleInput = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = event.target.value;
    const cursorPos = event.target.selectionStart || 0;

    setMessage(newValue);

    // Auto-resize textarea
    const target = event.target;
    target.style.height = 'auto';
    target.style.height = target.scrollHeight + 'px';

    // Detect @ mention
    const mentionState = detectAtMention(newValue, cursorPos);
    setAtMention(mentionState);

    if (mentionState.isActive) {
      setDropdownPosition(calculateDropdownPosition());
    }
  }, [detectAtMention, calculateDropdownPosition]);

  // Handle configuration button click
  const handleConfigurationClick = useCallback(() => {
    if (configButtonRef.current && textareaRef.current) {
      const buttonRect = configButtonRef.current.getBoundingClientRect();
      const containerRect = textareaRef.current.parentElement?.getBoundingClientRect();

      if (containerRect) {
        // Calculate position relative to the input container
        // Position dialog at left edge of button, top above button
        setConfigDialogPosition({
          top: buttonRect.top - containerRect.top - 420, // Position above button relative to container
          left: buttonRect.left - containerRect.left - 334 + buttonRect.width // Align right edge of dialog with right edge of button
        });
      }
    }
    onConfigurationOpen();
  }, [onConfigurationOpen]);

  // Handle cursor position changes
  const handleSelectionChange = useCallback(() => {
    if (!textareaRef.current) return;

    const cursorPos = textareaRef.current.selectionStart || 0;
    const mentionState = detectAtMention(message, cursorPos);

    if (!mentionState.isActive) {
      closeDropdown();
    }
  }, [message, detectAtMention, closeDropdown]);

  return (
    <div className="input-container" data-testid="input-container">
      {/* Textarea - full width */}
      <textarea
        ref={textareaRef}
        id="messageInput"
        className="message-input"
        value={message}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onSelect={handleSelectionChange}
        onClick={handleSelectionChange}
        disabled={disabled}
        placeholder="在这里输入您的消息..."
        rows={1}
        data-testid="message-input"
      />

      {/* Buttons row - right aligned */}
      <div className="input-buttons-row">
        <div className="button-spacer" />

        <div ref={configButtonRef}>
          <ConfigurationButton
            onClick={handleConfigurationClick}
            disabled={disabled}
          />
        </div>

        <button
          className="abort-button"
          id="abortButton"
          onClick={onAbortMessage}
          style={{ display: isStreaming ? 'block' : 'none' }}
          data-testid="abort-btn"
        >
          停止
        </button>

        <button
          id="sendButton"
          className="send-button"
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          data-testid="send-btn"
        >
          发送
        </button>
      </div>

      {/* File Suggestion Dropdown */}
      <FileSuggestionDropdown
        suggestions={suggestions}
        isVisible={atMention.isActive && (suggestions.length > 0 || isLoadingSuggestions)}
        selectedIndex={selectedIndex}
        onSelect={handleFileSelect}
        onClose={closeDropdown}
        position={dropdownPosition}
        filterText={atMention.filterText}
        isLoading={isLoadingSuggestions}
      />

      {/* Configuration Dialog */}
      <ConfigurationDialog
        isVisible={showConfiguration}
        configurationData={configurationData || {}}
        isLoading={configurationLoading}
        error={configurationError}
        onSave={onConfigurationSave}
        onCancel={onConfigurationCancel}
        position={configDialogPosition}
      />
    </div>
  );
};