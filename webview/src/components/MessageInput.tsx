import React, { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef, KeyboardEvent } from 'react';
import { convertToMarkdown } from '../utils/messageUtils';
import { ContextTag } from './ContextTag';
import ReactDOM from 'react-dom/client';
import type { MessageInputProps, FileItem, SlashCommand, AttachedImage, PermissionMode } from '../types';
import { FileSuggestionDropdown } from './FileSuggestionDropdown';
import { SlashCommandsPopup } from './SlashCommandsPopup';
import { PermissionModeDropdown } from './PermissionModeDropdown';
import { AttachedImages } from './AttachedImages';
import ConfigurationButton from './ConfigurationButton';
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

export const MessageInput = forwardRef<{ focus: () => void }, MessageInputProps>((props, ref) => {
  const {
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
    onConfigurationCancel,
    selection,
    inputContent,
    permissionMode,
    initialAttachedImages
  } = props;
  const [message, setMessage] = useState('');
  const [isSelectionEnabled, setIsSelectionEnabled] = useState(false);
  const lastSelectionRef = useRef<any>(null);

  const handlePermissionModeToggle = useCallback(() => {
    setIsPermissionMenuOpen(prev => !prev);
  }, []);

  const handlePermissionModeSelect = useCallback((mode: PermissionMode) => {
    vscode.postMessage({
      command: 'setPermissionMode',
      mode: mode
    });
    setIsPermissionMenuOpen(false);
  }, [vscode]);

  // Automatically enable selection tag when selection changes
  useEffect(() => {
    if (selection && !selection.isEmpty) {
      const selectionChanged = !lastSelectionRef.current ||
        lastSelectionRef.current.filePath !== selection.filePath ||
        lastSelectionRef.current.startLine !== selection.startLine ||
        lastSelectionRef.current.endLine !== selection.endLine ||
        lastSelectionRef.current.selectedText !== selection.selectedText;

      if (selectionChanged) {
        setIsSelectionEnabled(true);
      }
    }
    lastSelectionRef.current = selection;
  }, [selection]);
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
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLoadingSlashCommands, setIsLoadingSlashCommands] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>(initialAttachedImages || []);
  const [isPermissionMenuOpen, setIsPermissionMenuOpen] = useState(false);
  
  // Store the atMention state when file upload is triggered
  const [uploadAtMentionState, setUploadAtMentionState] = useState<AtMentionState>({ 
    isActive: false, 
    filterText: '', 
    startPos: 0, 
    endPos: 0 
  });

  const textareaRef = useRef<HTMLDivElement>(null);
  const configButtonRef = useRef<HTMLDivElement>(null);
  const permissionToggleRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef<string>('');

  // Expose focus method to parent component
  useImperativeHandle(ref, () => ({
    focus: () => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }));

  // Auto-focus input on component mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Initialize message from inputContent prop
  useEffect(() => {
    if (inputContent !== undefined && inputContent !== message) {
      setMessage(inputContent);
      
      // Adjust textarea height after setting message
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
      }, 0);
    }
  }, [inputContent]);
  
  // Initialize attached images from initialAttachedImages prop
  useEffect(() => {
    if (initialAttachedImages !== undefined) {
      setAttachedImages(initialAttachedImages);
    }
  }, [initialAttachedImages]);

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
      if (text[i] === ' ' || text[i] === '\n' || text[i] === '\u00A0') {
        break;
      }
    }

    if (atPos === -1) {
      return { isActive: false, filterText: '', startPos: 0, endPos: 0 };
    }

    // Check if @ is at start of line or preceded by whitespace
    const charBefore = text[atPos - 1];
    const isValidPosition = atPos === 0 || /\s/.test(charBefore) || charBefore === '\u00A0';
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

  // Handle input clearing when requested by parent
  useEffect(() => {
    if (shouldClearInput) {
      setMessage('');
      // Clear persisted input content
      vscode.postMessage({
        command: 'updateInputContent',
        content: ''
      });
      setAttachedImages([]);
      closeDropdown();
      onInputCleared?.();
    }
  }, [shouldClearInput, onInputCleared, vscode, closeDropdown]);

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

  // Handle inserting uploaded file paths into the input
  const insertUploadedFilePaths = useCallback((uploadedFiles: string[]) => {
    if (!textareaRef.current || uploadedFiles.length === 0) return;

    // Focus the input first to ensure we can work with selection
    textareaRef.current.focus();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;
    
    if (textNode.nodeType === Node.TEXT_NODE) {
      const text = textNode.textContent || '';
      // Try to find the @ mention. If we have saved state, use it, otherwise look back from cursor.
      const lastAtIndex = text.lastIndexOf('@', range.startOffset - 1);
      
      if (lastAtIndex !== -1) {
        range.setStart(textNode, lastAtIndex);
        range.deleteContents();
        
        uploadedFiles.forEach((filePath) => {
          const fileName = filePath.split(/[/\\]/).pop() || filePath;
          const isImage = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(fileName);
          
          const tagSpan = document.createElement('span');
          tagSpan.className = 'context-tag-container';
          tagSpan.contentEditable = 'false';
          tagSpan.setAttribute('data-path', filePath);
          tagSpan.setAttribute('data-name', fileName);
          tagSpan.setAttribute('data-is-image', String(isImage));
          
          const root = ReactDOM.createRoot(tagSpan);
          root.render(
            <ContextTag 
              name={fileName} 
              path={filePath} 
              icon={isImage ? 'codicon-file-media' : 'codicon-file-code'} 
              isImage={isImage}
            />
          );
          
          range.insertNode(tagSpan);
          range.setStartAfter(tagSpan);
          
          // Add space after each tag
          const space = document.createTextNode('\u00A0');
          range.insertNode(space);
          range.setStartAfter(space);
        });
        
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Trigger input event to update message state
        const inputEvent = new Event('input', { bubbles: true });
        textareaRef.current?.dispatchEvent(inputEvent);
      }
    }

    // Close dropdown and clear saved state
    closeDropdown();
    setUploadAtMentionState({ isActive: false, filterText: '', startPos: 0, endPos: 0 });
  }, [closeDropdown, uploadAtMentionState, atMention]);

  // Listen for file suggestions response from extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;

      if (data.command === 'fileSuggestionsResponse') {
        // Only process if this is the latest request
        if (data.requestId === requestIdRef.current) {
          setSuggestions(data.suggestions || []);
          // Set initial selected index: -1 if no filter text (upload option), 0 otherwise
          const hasFilterText = data.filterText && data.filterText.trim();
          setSelectedIndex(hasFilterText ? 0 : -1);
          setIsLoadingSuggestions(false);
        }
      } else if (data.command === 'fileSuggestionsError') {
        if (data.requestId === requestIdRef.current) {
          setSuggestions([]);
          setIsLoadingSuggestions(false);
          console.error('File suggestions error:', data.error);
        }
      } else if (data.command === 'slashCommandsResponse') {
        setSlashCommands(data.commands || []);
        setSelectedSlashIndex(0);
        setIsLoadingSlashCommands(false);
      } else if (data.command === 'slashCommandsError') {
        setSlashCommands([]);
        setIsLoadingSlashCommands(false);
        console.error('指令错误:', data.error);
      } else if (data.command === 'uploadSuccess') {
        console.log('文件上传成功:', data.uploadedFiles);
        
        // Insert uploaded file paths into the input after the @ symbol
        if (data.uploadedFiles && data.uploadedFiles.length > 0) {
          insertUploadedFilePaths(data.uploadedFiles);
        }
      } else if (data.command === 'uploadError') {
        console.error('文件上传失败:', data.error);
        // Could show an error notification here if needed
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [insertUploadedFilePaths, message, atMention, closeDropdown]);

  // Handle image preview
  const handleImagePreview = useCallback((url: string, name: string) => {
    console.log('handleImagePreview triggered:', { url: url.substring(0, 50) + '...', name });
    // Create a temporary modal for image preview
    const modal = document.createElement('div');
    modal.className = 'image-preview-modal';
    modal.onclick = () => document.body.removeChild(modal);
    
    const img = document.createElement('img');
    img.src = url;
    img.alt = name;
    img.onclick = (e) => e.stopPropagation();
    
    const closeBtn = document.createElement('div');
    closeBtn.className = 'image-preview-close';
    closeBtn.innerHTML = '<i class="codicon codicon-close"></i>';
    
    modal.appendChild(img);
    modal.appendChild(closeBtn);
    document.body.appendChild(modal);
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((file: FileItem) => {
    if (!textareaRef.current) return;

    // Handle upload option selection
    if (file.isUploadOption) {
      handleFileUpload();
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    
    // Find the @ mention text node and replace it
    // This is a simplified implementation. In a real app, you'd want to be more precise.
    // For now, we'll just insert the tag at the current cursor position and remove the @mention text.
    
    // Remove the @mention text (from atMention.startPos to atMention.endPos)
    // Since we are in contenteditable, we need to find the text node.
    
    // Create the tag element
    const tagSpan = document.createElement('span');
    tagSpan.className = 'context-tag-container'; // Wrapper for React component
    tagSpan.contentEditable = 'false';
    tagSpan.setAttribute('data-path', file.relativePath);
    tagSpan.setAttribute('data-name', file.name);
    tagSpan.setAttribute('data-is-image', String(!file.isDirectory && /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(file.name)));
    
    // Render the React component into the span
    const isImage = !file.isDirectory && /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(file.name);
    console.log('handleFileSelect rendering ContextTag:', { name: file.name, isImage });
    const root = ReactDOM.createRoot(tagSpan);
    root.render(
      <ContextTag 
        name={file.name} 
        path={file.relativePath} 
        icon={file.icon} 
        isImage={isImage}
        onClick={isImage ? () => {
          console.log('Previewing file image:', file.relativePath);
          vscode.postMessage({
            command: 'previewImage',
            path: file.path
          });
        } : undefined}
      />
    );

    // Find the '@' and the filter text to delete it.
    const textNode = range.startContainer;
    if (textNode.nodeType === Node.TEXT_NODE) {
      const text = textNode.textContent || '';
      const lastAtIndex = text.lastIndexOf('@', range.startOffset - 1);
      
      if (lastAtIndex !== -1) {
        // Set range to cover the '@' and filter text
        range.setStart(textNode, lastAtIndex);
        range.deleteContents();
        
        // Insert the tag
        range.insertNode(tagSpan);
        
        // Insert a space after the tag
        // Use a non-breaking space to ensure it's not collapsed by the browser
        const space = document.createTextNode('\u00A0');
        range.setStartAfter(tagSpan);
        range.insertNode(space);
        
        // Move cursor after the space
        range.setStartAfter(space);
        range.setEndAfter(space);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Trigger input event to update message state
        const inputEvent = new Event('input', { bubbles: true });
        textareaRef.current?.dispatchEvent(inputEvent);
      }
    }

    closeDropdown();
  }, [closeDropdown]);

  // Handle file upload
  const handleFileUpload = useCallback(() => {
    // Save the current atMention state before file dialog opens
    setUploadAtMentionState(atMention);
    
    // Create a hidden file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true; // Support multiple file selection
    fileInput.style.display = 'none';
    
    fileInput.onchange = (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        // Send files to backend for upload
        const fileArray = Array.from(files);
        vscode.postMessage({
          command: 'uploadFiles',
          files: fileArray.map(file => ({
            name: file.name,
            size: file.size,
            type: file.type
          }))
        });
        
        // Read files as base64 for upload
        const readers = fileArray.map(file => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                name: file.name,
                size: file.size,
                type: file.type,
                data: reader.result
              });
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
          });
        });
        
        Promise.all(readers).then(fileDataArray => {
          vscode.postMessage({
            command: 'uploadFilesToArtifacts',
            files: fileDataArray
          });
        }).catch(error => {
          console.error('Error reading files:', error);
          vscode.postMessage({
            command: 'showError',
            message: '读取文件失败: ' + error.message
          });
        });
      }
      
      // Cleanup
      document.body.removeChild(fileInput);
    };
    
    // Trigger file selection dialog
    document.body.appendChild(fileInput);
    fileInput.click();
    
    // Close the dropdown after triggering upload
    closeDropdown();
  }, [atMention, vscode, closeDropdown]);

  // Handle 指令 selection
  const handleSlashCommandSelect = useCallback((command: SlashCommand) => {
    if (!textareaRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;

    if (textNode.nodeType === Node.TEXT_NODE) {
      const text = textNode.textContent || '';
      // Find the last '/' before the cursor
      const lastSlashIndex = text.lastIndexOf('/', range.startOffset - 1);

      if (lastSlashIndex !== -1) {
        // Check if it's a valid position (start of line or preceded by whitespace)
        const charBefore = text[lastSlashIndex - 1];
        const isValidPosition = lastSlashIndex === 0 || /\s/.test(charBefore) || charBefore === '\u00A0';

        if (isValidPosition) {
          // Set range to cover the '/' and any filter text
          range.setStart(textNode, lastSlashIndex);
          range.deleteContents();

          // Insert the command text
          const commandText = `/${command.name}\u00A0`;
          const newNode = document.createTextNode(commandText);
          range.insertNode(newNode);

          // Move cursor after the inserted text
          range.setStartAfter(newNode);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);

          // Trigger input event to update message state
          const inputEvent = new Event('input', { bubbles: true });
          textareaRef.current.dispatchEvent(inputEvent);
        }
      }
    }

    closeSlashCommandPopup();
  }, [closeSlashCommandPopup]);

  const handleSend = useCallback(() => {
    if (!textareaRef.current) return;
    
    const { markdown, images: extractedImages } = convertToMarkdown(textareaRef.current);
    const allImages = [...attachedImages, ...extractedImages];

    if ((markdown.trim() || allImages.length > 0) && !disabled && !isStreaming) {
      // Convert attached images to base64 format for SDK
      const images = allImages.map(img => ({
        data: img.data, // This is already base64 data URL
        mediaType: img.mimeType
      }));
      
      onSendMessage(markdown, images.length > 0 ? images : undefined, isSelectionEnabled ? selection : undefined);
      
      // Clear contenteditable
      textareaRef.current.innerHTML = '';
      setMessage('');
      setIsSelectionEnabled(false);
      // Clear persisted input content
      vscode.postMessage({
        command: 'updateInputContent',
        content: ''
      });
      setAttachedImages([]);
      closeDropdown();
    }
  }, [message, attachedImages, disabled, isStreaming, onSendMessage, closeDropdown, isSelectionEnabled, selection]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    // Handle 指令 navigation
    if (slashCommand.isActive && slashCommands.length > 0) {
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          setSelectedSlashIndex((prev: number) => Math.max(0, prev - 1));
          return;
        case 'ArrowDown':
          event.preventDefault();
          setSelectedSlashIndex((prev: number) => Math.min(slashCommands.length - 1, prev + 1));
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
    if (atMention.isActive && (suggestions.length > 0 || !atMention.filterText)) {
      const hasUploadOption = !atMention.filterText;
      const totalItems = suggestions.length;
      const minIndex = hasUploadOption ? -1 : 0;
      const maxIndex = suggestions.length - 1;

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex((prev: number) => Math.max(minIndex, prev - 1));
          return;
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex((prev: number) => Math.min(maxIndex, prev + 1));
          return;
        case 'Enter':
          event.preventDefault();
          if (hasUploadOption && selectedIndex === -1) {
            // Handle upload option
            handleFileUpload();
          } else if (suggestions[selectedIndex]) {
            handleFileSelect(suggestions[selectedIndex]);
          }
          return;
        case 'Escape':
          event.preventDefault();
          if (isStreaming) {
            onAbortMessage();
          }
          closeDropdown();
          return;
      }
    }

    // Handle Esc key for interruption when focused and streaming
    if (event.key === 'Escape' && isStreaming) {
      event.preventDefault();
      onAbortMessage();
      return;
    }

    // Normal behavior for Enter key
    if (event.key === 'Enter' && !event.shiftKey && !isComposing) {
      event.preventDefault();
      handleSend();
    }
  }, [slashCommand.isActive, slashCommands, selectedSlashIndex, handleSlashCommandSelect, closeSlashCommandPopup, atMention.isActive, atMention.filterText, suggestions, selectedIndex, handleFileSelect, handleFileUpload, closeDropdown, handleSend, isComposing]);

  // Handle cursor position changes
  const handleSelectionChange = useCallback(() => {
    if (!textareaRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(textareaRef.current);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    
    const textBeforeCursor = preCaretRange.toString();
    const currentText = textareaRef.current.innerText;

    // Use textBeforeCursor for detection as it's more reliable for cursor position
    const mentionState = detectAtMention(textBeforeCursor, textBeforeCursor.length);
    const slashCommandState = detectSlashCommand(textBeforeCursor, textBeforeCursor.length);

    if (!mentionState.isActive) {
      closeDropdown();
    } else {
      setAtMention(mentionState);
      setDropdownPosition(calculateDropdownPosition());
    }

    if (!slashCommandState.isActive) {
      closeSlashCommandPopup();
    } else {
      setSlashCommand(slashCommandState);
      setSlashPopupPosition(calculateDropdownPosition());
    }
  }, [detectAtMention, detectSlashCommand, closeDropdown, closeSlashCommandPopup, calculateDropdownPosition]);

  const handleInput = useCallback((event: React.FormEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const newValue = target.innerText;
    
    setMessage(newValue);
    
    // Send updated content to extension for persistence
    vscode.postMessage({
      command: 'updateInputContent',
      content: newValue
    });

    // Use setTimeout to ensure selection is updated after DOM changes
    setTimeout(() => {
      handleSelectionChange();
    }, 0);
  }, [handleSelectionChange, vscode]);

  // Handle configuration button click
  const handleConfigurationClick = useCallback(() => {
    onConfigurationOpen();
  }, [onConfigurationOpen]);

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
        
        // Insert inline tag for the image
        if (!textareaRef.current) continue;
        
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) continue;
        
        const range = selection.getRangeAt(0);
        
        const tagSpan = document.createElement('span');
        tagSpan.className = 'context-tag-container';
        tagSpan.contentEditable = 'false';
        tagSpan.setAttribute('data-path', `pasted-image-${Date.now()}.png`);
        tagSpan.setAttribute('data-name', file.name || 'pasted-image.png');
        tagSpan.setAttribute('data-is-image', 'true');
        tagSpan.setAttribute('data-image-url', dataUrl);
        
        console.log('handleImagePaste rendering ContextTag:', { name: file.name || 'pasted-image.png' });
        const root = ReactDOM.createRoot(tagSpan);
        root.render(
          <ContextTag 
            name={file.name || 'pasted-image.png'} 
            path={`pasted-image-${Date.now()}.png`} 
            icon="codicon-file-media"
            isImage={true}
            onClick={() => handleImagePreview(dataUrl, file.name || 'pasted-image.png')}
          />
        );
        
        range.deleteContents();
        range.insertNode(tagSpan);
        
        // Insert a space after the tag
        const space = document.createTextNode(' ');
        range.setStartAfter(tagSpan);
        range.insertNode(space);
        range.setStartAfter(space);
        range.setEndAfter(space);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Trigger input event to update message state
        const inputEvent = new Event('input', { bubbles: true });
        textareaRef.current.dispatchEvent(inputEvent);
        
      } catch (error) {
        console.error('Failed to process image:', error);
      }
    }
  }, [createDataUrlFromBlob, textareaRef]);

  const handleRemoveImage = useCallback((imageId: string) => {
    setAttachedImages((prev: AttachedImage[]) => prev.filter((img: AttachedImage) => img.id !== imageId));
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
      <div className="input-wrapper">
        {/* Selection Tag */}
        {selection && (
          <div 
            className={`selection-tag ${isSelectionEnabled ? 'enabled' : 'disabled'}`}
            onClick={() => setIsSelectionEnabled(!isSelectionEnabled)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsSelectionEnabled(!isSelectionEnabled);
              }
            }}
            tabIndex={0}
            role="button"
            title={isSelectionEnabled 
              ? `正在向 AI 展示您的当前选择 (${selection.fileName}${selection.isEmpty ? '' : `:${selection.startLine}-${selection.endLine}`})` 
              : `未向 AI 展示您的当前选择. 点击以附加.`}
          >
            <i className={`codicon ${isSelectionEnabled ? 'codicon-code' : 'codicon-circle-slash'}`}></i>
            <span>
              {selection.fileName.split(/[/\\]/).pop()}
              {!selection.isEmpty && `#${selection.startLine}-${selection.endLine}`}
            </span>
          </div>
        )}
        
        {/* ContentEditable - full width */}
        <div
          ref={textareaRef}
          id="messageInput"
          className="message-input content-editable-input"
          contentEditable={!disabled}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onSelect={handleSelectionChange}
          onClick={handleSelectionChange}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          data-testid="message-input"
          data-placeholder="输入 / 发送指令，输入 @ 添加上下文，或粘贴图片..."
        />

        {/* Buttons row */}
        <div className="input-buttons-row">
          {/* Left side - Permission Mode Toggle */}
          <div className="permission-mode-container" ref={permissionToggleRef}>
            <div 
              className={`permission-mode-toggle mode-${permissionMode || 'default'}`}
              onClick={handlePermissionModeToggle}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handlePermissionModeToggle();
                }
              }}
              tabIndex={0}
              role="button"
              title={
                permissionMode === 'plan' ? '计划模式：仅允许修改计划文件' :
                permissionMode === 'acceptEdits' ? '自动接受修改' : '修改前询问'
              }
            >
              <i className={`codicon ${
                permissionMode === 'plan' ? 'codicon-notebook' :
                permissionMode === 'acceptEdits' ? 'codicon-zap' : 'codicon-edit'
              }`}></i>
              <span>{
                permissionMode === 'plan' ? '计划模式' :
                permissionMode === 'acceptEdits' ? '自动接受修改' : '修改前询问'
              }</span>
              <i className="codicon codicon-chevron-up" style={{ fontSize: '10px', marginLeft: '2px', opacity: 0.8 }}></i>
            </div>
            <PermissionModeDropdown
              isVisible={isPermissionMenuOpen}
              currentMode={permissionMode || 'default'}
              onSelect={handlePermissionModeSelect}
              onClose={() => setIsPermissionMenuOpen(false)}
              triggerRef={permissionToggleRef}
            />
          </div>

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
          isVisible={!!(atMention.isActive && (suggestions.length > 0 || isLoadingSuggestions || !atMention.filterText))}
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
      </div>
    </div>
  );
});