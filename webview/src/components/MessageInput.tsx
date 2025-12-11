import React, { useState, useCallback, KeyboardEvent, useEffect, useRef } from 'react';
import type { MessageInputProps, FileItem, ConfigurationData, SlashCommand, AttachedImage } from '../types';
import { FileSuggestionDropdown } from './FileSuggestionDropdown';
import { SlashCommandsPopup } from './SlashCommandsPopup';
import { AttachedImages } from './AttachedImages';
import ConfigurationButton from './ConfigurationButton';
import ConfigurationDialog from './ConfigurationDialog';
import '../styles/MessageInput.css';

interface AtMentionState {
  isActive: boolean;
  filterText: string;
  startPos: number;
  endPos: number;
}

interface SlashCommandState {
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
  const [slashCommand, setSlashCommand] = useState<SlashCommandState>({
    isActive: false,
    filterText: '',
    startPos: 0,
    endPos: 0
  });
  const [suggestions, setSuggestions] = useState<FileItem[]>([]);
  const [slashCommands, setSlashCommands] = useState<SlashCommand[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [slashPopupPosition, setSlashPopupPosition] = useState({ top: 0, left: 0 });
  const [configDialogPosition, setConfigDialogPosition] = useState({ top: 0, left: 0 });
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLoadingSlashCommands, setIsLoadingSlashCommands] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const configButtonRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef<string>('');

  // Auto-focus input on component mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Handle input clearing when requested by parent
  useEffect(() => {
    if (shouldClearInput) {
      setMessage('');
      setAttachedImages([]);
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

  // Close 指令 popup helper
  const closeSlashCommandPopup = useCallback(() => {
    setSlashCommand({ isActive: false, filterText: '', startPos: 0, endPos: 0 });
    setSlashCommands([]);
    setSelectedSlashIndex(0);
    setIsLoadingSlashCommands(false);
  }, []);

  // Detect 指令 in text
  const detectSlashCommand = useCallback((text: string, cursorPos: number): SlashCommandState => {
    // Find the last / symbol before cursor position
    let slashPos = -1;
    for (let i = cursorPos - 1; i >= 0; i--) {
      if (text[i] === '/') {
        slashPos = i;
        break;
      }
      // Stop if we hit whitespace or newline
      if (text[i] === ' ' || text[i] === '\n') {
        break;
      }
    }

    if (slashPos === -1) {
      return { isActive: false, filterText: '', startPos: 0, endPos: 0 };
    }

    // Check if / is at start of line or preceded by whitespace
    const isValidPosition = slashPos === 0 || /\s/.test(text[slashPos - 1]);
    if (!isValidPosition) {
      return { isActive: false, filterText: '', startPos: 0, endPos: 0 };
    }

    // Extract filter text after /
    const afterSlash = text.slice(slashPos + 1, cursorPos);

    // Check if filter text contains invalid characters
    if (/\s/.test(afterSlash)) {
      return { isActive: false, filterText: '', startPos: 0, endPos: 0 };
    }

    return {
      isActive: true,
      filterText: afterSlash,
      startPos: slashPos,
      endPos: cursorPos
    };
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

  // Request 指令 from extension
  const requestSlashCommands = useCallback((filterText: string) => {
    setIsLoadingSlashCommands(true);

    vscode.postMessage({
      command: 'requestSlashCommands',
      filterText: filterText
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

  // Debounced 指令 requests
  useEffect(() => {
    if (slashCommand.isActive) {
      const timer = setTimeout(() => {
        requestSlashCommands(slashCommand.filterText);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setSlashCommands([]);
      setIsLoadingSlashCommands(false);
    }
  }, [slashCommand.isActive, slashCommand.filterText, requestSlashCommands]);

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
      } else if (message.command === 'slashCommandsResponse') {
        setSlashCommands(message.commands || []);
        setSelectedSlashIndex(0);
        setIsLoadingSlashCommands(false);
      } else if (message.command === 'slashCommandsError') {
        setSlashCommands([]);
        setIsLoadingSlashCommands(false);
        console.error('指令错误:', message.error);
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

  // Handle 指令 selection
  const handleSlashCommandSelect = useCallback((command: SlashCommand) => {
    if (!textareaRef.current) return;

    const newMessage = message.slice(0, slashCommand.startPos) +
                      `/${command.name} ` +
                      message.slice(slashCommand.endPos);

    setMessage(newMessage);
    closeSlashCommandPopup();

    // Focus back to textarea and set cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = slashCommand.startPos + command.name.length + 2; // +2 for '/' and ' '
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  }, [message, slashCommand.startPos, slashCommand.endPos, closeSlashCommandPopup]);

  const handleSend = useCallback(() => {
    if ((message.trim() || attachedImages.length > 0) && !disabled && !isStreaming) {
      // Convert attached images to base64 format for SDK
      const images = attachedImages.map(img => ({
        data: img.data, // This is already base64 data URL
        mediaType: img.mimeType
      }));
      
      onSendMessage(message, images.length > 0 ? images : undefined);
      setMessage('');
      setAttachedImages([]);
      closeDropdown();
    }
  }, [message, attachedImages, disabled, isStreaming, onSendMessage, closeDropdown]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle 指令 navigation
    if (slashCommand.isActive && slashCommands.length > 0) {
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          setSelectedSlashIndex(prev => Math.max(0, prev - 1));
          return;
        case 'ArrowDown':
          event.preventDefault();
          setSelectedSlashIndex(prev => Math.min(slashCommands.length - 1, prev + 1));
          return;
        case 'Enter':
          event.preventDefault();
          if (slashCommands[selectedSlashIndex]) {
            handleSlashCommandSelect(slashCommands[selectedSlashIndex]);
          }
          return;
        case 'Escape':
          event.preventDefault();
          closeSlashCommandPopup();
          return;
      }
    }

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
    if (event.key === 'Enter' && !event.shiftKey && !isComposing) {
      event.preventDefault();
      handleSend();
    }
  }, [slashCommand.isActive, slashCommands, selectedSlashIndex, handleSlashCommandSelect, closeSlashCommandPopup, atMention.isActive, suggestions, selectedIndex, handleFileSelect, closeDropdown, handleSend, isComposing]);

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

    // Detect 指令
    const slashCommandState = detectSlashCommand(newValue, cursorPos);
    setSlashCommand(slashCommandState);

    if (mentionState.isActive) {
      setDropdownPosition(calculateDropdownPosition());
    }

    if (slashCommandState.isActive) {
      setSlashPopupPosition(calculateDropdownPosition());
    }
  }, [detectAtMention, detectSlashCommand, calculateDropdownPosition]);

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
    const slashCommandState = detectSlashCommand(message, cursorPos);

    if (!mentionState.isActive) {
      closeDropdown();
    }

    if (!slashCommandState.isActive) {
      closeSlashCommandPopup();
    }
  }, [message, detectAtMention, detectSlashCommand, closeDropdown, closeSlashCommandPopup]);

  // Handle IME composition events
  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);

  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false);
  }, []);

  // Image handling functions
  const generateImageId = useCallback(() => {
    return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const createDataUrlFromBlob = useCallback((blob: Blob, filename: string): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.readAsDataURL(blob);
    });
  }, []);

  const handleImagePaste = useCallback(async (files: FileList) => {
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    for (const file of imageFiles) {
      try {
        const dataUrl = await createDataUrlFromBlob(file, file.name);
        const newImage: AttachedImage = {
          id: generateImageId(),
          data: dataUrl,
          mimeType: file.type,
          filename: file.name,
          size: file.size
        };
        
        setAttachedImages(prev => [...prev, newImage]);
      } catch (error) {
        console.error('Failed to process image:', error);
      }
    }
  }, [generateImageId]);

  const handleRemoveImage = useCallback((imageId: string) => {
    setAttachedImages(prev => prev.filter(img => img.id !== imageId));
  }, []);

  // Paste event handler
  const handlePaste = useCallback((event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      event.preventDefault();
      const fileList = new DataTransfer();
      files.forEach(file => fileList.items.add(file));
      handleImagePaste(fileList.files);
    }
  }, [handleImagePaste]);

  // Add event listeners for paste only
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const pasteHandler = (e: ClipboardEvent) => handlePaste(e);

    textarea.addEventListener('paste', pasteHandler);

    return () => {
      textarea.removeEventListener('paste', pasteHandler);
    };
  }, [handlePaste]);

  return (
    <div className="input-container" data-testid="input-container">
      {/* Attached Images */}
      {attachedImages.length > 0 && (
        <AttachedImages
          images={attachedImages}
          onRemove={handleRemoveImage}
        />
      )}
      
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
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        disabled={disabled}
        placeholder="在这里输入您的消息或粘贴图片..."
        rows={1}
        data-testid="message-input"
      />

      {/* Buttons row - right aligned */}
      <div className="input-buttons-row">
        {/* Left side - 指令 button */}
        <button
          className="slash-command-button"
          onClick={() => {
            // Request 指令 when button is clicked
            requestSlashCommands('');
            setSlashCommand({ isActive: true, filterText: '', startPos: message.length, endPos: message.length });
            setSlashPopupPosition(calculateDropdownPosition());
          }}
          disabled={disabled}
          title="指令"
          data-testid="slash-command-btn"
        >
          指令
        </button>

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
          disabled={disabled || (!message.trim() && attachedImages.length === 0)}
          style={{ display: isStreaming ? 'none' : 'block' }}
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

      {/* 指令弹窗 */}
      <SlashCommandsPopup
        commands={slashCommands}
        isVisible={slashCommand.isActive && (slashCommands.length > 0 || isLoadingSlashCommands)}
        selectedIndex={selectedSlashIndex}
        onSelect={handleSlashCommandSelect}
        onClose={closeSlashCommandPopup}
        position={slashPopupPosition}
        isLoading={isLoadingSlashCommands}
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