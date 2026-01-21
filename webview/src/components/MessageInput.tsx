import React, { useState, useCallback, KeyboardEvent, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import type { MessageInputProps, FileItem, ConfigurationData, SlashCommand, AttachedImage, PermissionMode } from '../types';
import { FileSuggestionDropdown } from './FileSuggestionDropdown';
import { SlashCommandsPopup } from './SlashCommandsPopup';
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

export const MessageInput = forwardRef<{ focus: () => void }, MessageInputProps>(({
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
  permissionMode
}, ref) => {
  const [message, setMessage] = useState('');
  const [isSelectionEnabled, setIsSelectionEnabled] = useState(false);
  const lastSelectionRef = useRef<any>(null);

  const handlePermissionModeToggle = useCallback(() => {
    const currentMode = permissionMode || 'default';
    let newMode: PermissionMode = 'default';
    if (currentMode === 'default') {
      newMode = 'acceptEdits';
    } else if (currentMode === 'acceptEdits') {
      newMode = 'plan';
    } else {
      newMode = 'default';
    }
    
    vscode.postMessage({
      command: 'setPermissionMode',
      mode: newMode
    });
  }, [permissionMode, vscode]);

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
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  
  // Knowledge Base navigation state
  const [kbNavigation, setKbNavigation] = useState<{
    isActive: boolean;
    level: 'root' | 'kb' | 'folder';
    kbId?: string | number;
    folderId?: string | number;
  }>({
    isActive: false,
    level: 'root'
  });

  // Store the atMention state when file upload is triggered
  const [uploadAtMentionState, setUploadAtMentionState] = useState<AtMentionState>({ 
    isActive: false, 
    filterText: '', 
    startPos: 0, 
    endPos: 0 
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const configButtonRef = useRef<HTMLDivElement>(null);
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

  // Close dropdown helper
  const closeDropdown = useCallback(() => {
    setAtMention({ isActive: false, filterText: '', startPos: 0, endPos: 0 });
    setSuggestions([]);
    setSelectedIndex(0);
    setIsLoadingSuggestions(false);
    setKbNavigation({ isActive: false, level: 'root' });
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
      if (kbNavigation.isActive) {
        fetchKnowledgeBaseItems();
      } else {
        const timer = setTimeout(() => {
          requestFileSuggestions(atMention.filterText);
        }, 150);
        return () => clearTimeout(timer);
      }
    } else {
      setSuggestions([]);
      setIsLoadingSuggestions(false);
      setKbNavigation({ isActive: false, level: 'root' });
    }
  }, [atMention.isActive, atMention.filterText, requestFileSuggestions, kbNavigation.isActive, kbNavigation.level, kbNavigation.kbId, kbNavigation.folderId]);

  const fetchKnowledgeBaseItems = useCallback(() => {
    if (!configurationData?.backendLink) return;

    setIsLoadingSuggestions(true);
    vscode.postMessage({
      command: 'getKbItems',
      level: kbNavigation.level,
      kbId: kbNavigation.kbId,
      folderId: kbNavigation.folderId,
      backendLink: configurationData.backendLink
    });
  }, [configurationData?.backendLink, kbNavigation, vscode]);

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

    // Create file paths string (space-separated for multiple files) and add trailing space
    const filePaths = uploadedFiles.join(' ') + ' '; // Add space after file paths
    
    // Use the saved atMention state from when upload was triggered, not the current one
    // This prevents issues caused by focus loss during file selection dialog
    const savedAtMention = uploadAtMentionState.isActive ? uploadAtMentionState : atMention;
    
    // Replace the entire @ mention (including the @ symbol) with file paths
    // This matches the behavior of regular file selection
    const newMessage = message.slice(0, savedAtMention.startPos) +
                      filePaths +
                      message.slice(savedAtMention.endPos);

    setMessage(newMessage);

    // Focus back to textarea and set cursor position after inserted paths
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = savedAtMention.startPos + filePaths.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);

    // Close dropdown and clear saved state
    closeDropdown();
    setUploadAtMentionState({ isActive: false, filterText: '', startPos: 0, endPos: 0 });
  }, [message, atMention, uploadAtMentionState, closeDropdown]);

  // Listen for file suggestions response from extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;

      if (data.command === 'fileSuggestionsResponse') {
        // Only process if this is the latest request
        if (data.requestId === requestIdRef.current) {
          setSuggestions(data.suggestions || []);
          // Set initial selected index: -2 if no filter text and both options available, -1 if only upload, 0 otherwise
          const hasFilterText = data.filterText && data.filterText.trim();
          const hasUploadOption = !hasFilterText && !kbNavigation.isActive;
          const hasKB = hasUploadOption && configurationData?.backendLink && configurationData.backendLink.trim() !== '';
          setSelectedIndex(hasFilterText ? 0 : (hasKB ? -2 : -1));
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
      } else if (data.command === 'kbItemsResponse') {
        const { level, kbId, folderId, result } = data;
        
        if (!result || !result.success) {
          console.error('获取知识库数据失败:', result?.error || '未知错误');
          setIsLoadingSuggestions(false);
          return;
        }

        // Handle both { data: { data: [] } } and { data: [] } formats
        let dataItems = [];
        if (result.data) {
          if (Array.isArray(result.data)) {
            dataItems = result.data;
          } else if (result.data.data && Array.isArray(result.data.data)) {
            dataItems = result.data.data;
          }
        }
        let items: FileItem[] = [];

        if (level === 'root') {
          items = dataItems.map((kb: any) => ({
            path: `kb:${kb.id}`,
            relativePath: `知识库: ${kb.name}`,
            name: kb.name,
            extension: '',
            icon: 'codicon-library',
            isDirectory: true,
            isKnowledgeBaseOption: true,
            kbType: 'kb',
            kbId: kb.id
          }));
        } else if (level === 'kb') {
          items = dataItems.map((folder: any) => ({
            path: `folder:${folder.id}`,
            relativePath: `目录: ${folder.name}`,
            name: folder.name,
            extension: '',
            icon: 'codicon-folder',
            isDirectory: true,
            isKnowledgeBaseOption: true,
            kbType: 'folder',
            kbId: kbId,
            folderId: folder.id
          }));
        } else if (level === 'folder') {
          items = dataItems.map((file: any) => ({
            path: `file:${file.id}`,
            relativePath: `文件: ${file.original_filename}`,
            name: file.original_filename,
            extension: file.original_filename.split('.').pop() || '',
            icon: 'codicon-file',
            isDirectory: false,
            isKnowledgeBaseOption: true,
            kbType: 'file',
            kbId: kbId,
            folderId: folderId,
            fileId: file.id
          }));
        }

        setSuggestions(items);
        setSelectedIndex(0);
        setIsLoadingSuggestions(false);
      } else if (data.command === 'kbItemsError') {
        console.error('知识库错误:', data.error);
        setIsLoadingSuggestions(false);
      } else if (data.command === 'kbFileDownloadError') {
        console.error('知识库文件下载失败:', data.error);
        setIsLoadingSuggestions(false);
      } else if (data.command === 'kbFileDownloaded') {
        console.log('知识库文件下载成功:', data.tempPath);
        
        // Insert the temporary path into the input
        const filePathWithSpace = data.tempPath + ' ';
        const newMessage = message.slice(0, atMention.startPos) +
                          filePathWithSpace +
                          message.slice(atMention.endPos);

        setMessage(newMessage);
        closeDropdown();

        // Focus back to textarea and set cursor position
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            const newCursorPos = atMention.startPos + filePathWithSpace.length;
            textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          }
        }, 0);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [insertUploadedFilePaths, message, atMention, closeDropdown]);

  // Handle file selection
  const handleFileSelect = useCallback((file: FileItem) => {
    if (!textareaRef.current) return;

    // Handle upload option selection
    if (file.isUploadOption) {
      handleFileUpload();
      return;
    }

    // Handle knowledge base option selection
    if (file.isKnowledgeBaseOption) {
      if (file.path === '__kb__') {
        setKbNavigation({ isActive: true, level: 'root' });
        setSelectedIndex(0);
        setSuggestions([]);
        setIsLoadingSuggestions(true);
        return;
      }

      if (file.kbType === 'kb') {
        setKbNavigation({ isActive: true, level: 'kb', kbId: file.kbId });
        setSelectedIndex(0);
        setSuggestions([]);
        setIsLoadingSuggestions(true);
        return;
      }

      if (file.kbType === 'folder') {
        setKbNavigation({ isActive: true, level: 'folder', kbId: file.kbId, folderId: file.folderId });
        setSelectedIndex(0);
        setSuggestions([]);
        setIsLoadingSuggestions(true);
        return;
      }

      if (file.kbType === 'file') {
        // Download file and insert path
        handleKbFileDownload(file);
        return;
      }
    }

    const filePathWithSpace = file.relativePath + ' '; // Add space after file path
    const newMessage = message.slice(0, atMention.startPos) +
                      filePathWithSpace +
                      message.slice(atMention.endPos);

    setMessage(newMessage);
    closeDropdown();

    // Focus back to textarea and set cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = atMention.startPos + filePathWithSpace.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  }, [message, atMention.startPos, atMention.endPos, closeDropdown]);

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

  const handleKbFileDownload = useCallback((file: FileItem) => {
    if (!configurationData?.backendLink || !file.fileId) return;

    setIsLoadingSuggestions(true);
    vscode.postMessage({
      command: 'downloadKbFile',
      fileId: file.fileId,
      fileName: file.name,
      backendLink: configurationData.backendLink
    });
  }, [configurationData?.backendLink, vscode]);

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
      
      onSendMessage(message, images.length > 0 ? images : undefined, isSelectionEnabled ? selection : undefined);
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
    if (atMention.isActive && (suggestions.length > 0 || !atMention.filterText)) {
      const hasUploadOption = !atMention.filterText && !kbNavigation.isActive;
      const hasKB = hasUploadOption && configurationData?.backendLink && configurationData.backendLink.trim() !== '';
      const totalItems = suggestions.length;
      const minIndex = hasUploadOption ? (hasKB ? -2 : -1) : 0;
      const maxIndex = suggestions.length - 1;

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex(prev => Math.max(minIndex, prev - 1));
          return;
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev => Math.min(maxIndex, prev + 1));
          return;
        case 'Enter':
          event.preventDefault();
          if (hasUploadOption && ((hasKB && selectedIndex === -2) || (!hasKB && selectedIndex === -1))) {
            // Handle upload option
            handleFileUpload();
          } else if (hasUploadOption && hasKB && selectedIndex === -1) {
            // Handle knowledge base option
            handleFileSelect({
              path: '__kb__',
              relativePath: '__kb__',
              name: '知识库',
              extension: '',
              icon: 'codicon-library',
              isDirectory: true,
              isKnowledgeBaseOption: true
            });
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

  const handleInput = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = event.target.value;
    const cursorPos = event.target.selectionStart || 0;

    setMessage(newValue);
    
    // Send updated content to extension for persistence
    vscode.postMessage({
      command: 'updateInputContent',
      content: newValue
    });

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
          placeholder="输入 / 发送指令，输入 @ 添加上下文，或粘贴图片..."
          rows={2}
          data-testid="message-input"
        />

        {/* Buttons row */}
        <div className="input-buttons-row">
          {/* Left side - Permission Mode Toggle */}
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
          isVisible={!!(atMention.isActive && (suggestions.length > 0 || isLoadingSuggestions || (!atMention.filterText && configurationData?.backendLink && configurationData.backendLink.trim() !== '' && !kbNavigation.isActive)))}
          selectedIndex={selectedIndex}
          onSelect={handleFileSelect}
          onClose={closeDropdown}
          position={dropdownPosition}
          filterText={atMention.filterText}
          isLoading={isLoadingSuggestions}
          hasKnowledgeBase={!!(configurationData?.backendLink && configurationData.backendLink.trim() !== '')}
          isKbNavigationActive={kbNavigation.isActive}
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