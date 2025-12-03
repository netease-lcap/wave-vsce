const vscode = acquireVsCodeApi();
let isStreaming = false;
let streamingMessage = null;

// Handle messages from the extension
window.addEventListener('message', event => {
    const message = event.data;
    console.log('Webview received:', message.command);
    
    switch (message.command) {
        case 'updateMessages':
            updateMessagesDisplay(message.messages);
            break;
        case 'startStreaming':
            startStreaming();
            break;
        case 'updateStreaming':
            updateStreamingContent(message.accumulated);
            break;
        case 'updateTool':
            updateToolStatus(message.params);
            break;
        case 'showError':
            showError(message.error);
            break;
        case 'clearMessages':
            clearMessages();
            break;
        case 'messageAborted':
            handleMessageAborted(message.partialContent);
            break;
    }
});

function startStreaming() {
    console.log('Starting streaming response');
    isStreaming = true;
    
    // Show abort button and disable send/input
    updateButtonVisibility();
    setSendEnabled(false);
    
    const container = document.getElementById('messagesContainer');
    streamingMessage = document.createElement('div');
    streamingMessage.className = 'message assistant streaming';
    streamingMessage.innerHTML = '<div class="message-content">...</div>';
    container.appendChild(streamingMessage);
    
    scrollToBottom();
}

function updateStreamingContent(accumulated) {
    if (isStreaming && streamingMessage && accumulated) {
        const contentDiv = streamingMessage.querySelector('.message-content');
        if (contentDiv) {
            contentDiv.textContent = accumulated;
        }
        scrollToBottom();
    }
}

function abortMessage() {
    if (!isStreaming) return;
    
    // Send abort command to extension
    vscode.postMessage({
        command: 'abortMessage'
    });
}

function handleMessageAborted(partialContent) {
    // Remove streaming message if it exists
    if (streamingMessage) {
        streamingMessage.remove();
        streamingMessage = null;
    }
    
    // Always add aborted message, even if content is empty
    const container = document.getElementById('messagesContainer');
    const abortedMessage = document.createElement('div');
    abortedMessage.className = 'message assistant aborted';
    
    const contentText = partialContent && partialContent.trim() ? partialContent : '...';
    abortedMessage.innerHTML = `<div class="message-content">${escapeHtml(contentText)}</div>`;
    
    container.appendChild(abortedMessage);
    scrollToBottom();
    
    // Reset streaming state
    isStreaming = false;
    updateButtonVisibility();
    setSendEnabled(true);
}

function updateButtonVisibility() {
    const abortButton = document.getElementById('abortButton');
    const sendButton = document.getElementById('sendButton');
    const clearButton = document.querySelector('[onclick="clearChat()"]');
    const analyzeButton = document.querySelector('[onclick="getWorkspaceInfo()"]');
    
    if (isStreaming) {
        abortButton.style.display = 'block';
        sendButton.disabled = true;
        if (clearButton) clearButton.disabled = true;
        if (analyzeButton) analyzeButton.disabled = true;
    } else {
        abortButton.style.display = 'none';
        sendButton.disabled = false;
        if (clearButton) clearButton.disabled = false;
        if (analyzeButton) analyzeButton.disabled = false;
    }
}

function updateMessagesDisplay(messages) {
    console.log('Final messages update:', messages.length);
    
    // Remove streaming message if it exists
    if (streamingMessage) {
        streamingMessage.remove();
        streamingMessage = null;
    }
    isStreaming = false;
    updateButtonVisibility();
    
    const container = document.getElementById('messagesContainer');
    
    // Clear all messages except welcome message
    while (container.children.length > 1) {
        container.removeChild(container.lastChild);
    }
    
    // Add all messages from the conversation
    messages.forEach(message => {
        if (message.content && message.content.trim()) {
            addMessageToDisplay(message);
        }
    });
    
    scrollToBottom();
    setSendEnabled(true);
}

function addMessageToDisplay(message) {
    const container = document.getElementById('messagesContainer');
    const messageDiv = document.createElement('div');
    
    if (message.role === 'user') {
        messageDiv.className = 'message user';
        messageDiv.innerHTML = `<div class="message-content">${escapeHtml(message.content)}</div>`;
    } else if (message.role === 'assistant') {
        // Check if this is an error message
        if (message.isError) {
            messageDiv.className = 'message error';
            messageDiv.innerHTML = `<div class="message-content">Error: ${escapeHtml(message.content)}</div>`;
        } else {
            messageDiv.className = 'message assistant';
            messageDiv.innerHTML = `<div class="message-content">${escapeHtml(message.content)}</div>`;
            
            // Add tool calls if any
            if (message.tool_calls) {
                message.tool_calls.forEach(toolCall => {
                    const toolDiv = document.createElement('div');
                    toolDiv.className = 'tool-block';
                    toolDiv.innerHTML = `
                        <div class="tool-header">🛠️ ${toolCall.function.name}</div>
                        <pre>${escapeHtml(JSON.stringify(JSON.parse(toolCall.function.arguments), null, 2))}</pre>
                    `;
                    messageDiv.appendChild(toolDiv);
                });
            }
        }
    }
    
    container.appendChild(messageDiv);
}

function updateToolStatus(params) {
    console.log('Tool update:', params);
}

function showError(error) {
    const container = document.getElementById('messagesContainer');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'message error';
    errorDiv.innerHTML = `<div class="message-content">Error: ${escapeHtml(error)}</div>`;
    container.appendChild(errorDiv);
    scrollToBottom();
    isStreaming = false;
    updateButtonVisibility();
    setSendEnabled(true);
}

function clearMessages() {
    const container = document.getElementById('messagesContainer');
    while (container.children.length > 1) {
        container.removeChild(container.lastChild);
    }
    
    // Reset streaming state when messages are cleared
    if (streamingMessage) {
        streamingMessage = null;
    }
    isStreaming = false;
    updateButtonVisibility();
    setSendEnabled(true);
    
    // Clear input field as well
    const input = document.getElementById('messageInput');
    if (input) {
        input.value = '';
        input.style.height = 'auto';
    }
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message || isStreaming) return;
    
    console.log('Sending message:', message);
    
    // Add user message immediately
    const container = document.getElementById('messagesContainer');
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'message user';
    userMessageDiv.innerHTML = `<div class="message-content">${escapeHtml(message)}</div>`;
    container.appendChild(userMessageDiv);
    
    // Clear input and disable send
    input.value = '';
    input.style.height = 'auto';
    setSendEnabled(false);
    
    // Send to extension
    vscode.postMessage({
        command: 'sendMessage',
        text: message
    });
    
    scrollToBottom();
}

function clearChat() {
    if (isStreaming) return; // Don't allow clearing during streaming
    
    console.log('Clear chat requested');
    vscode.postMessage({
        command: 'clearChat'
    });
}

function getWorkspaceInfo() {
    if (isStreaming) return;
    
    console.log('Get workspace info requested');
    setSendEnabled(false);
    vscode.postMessage({
        command: 'getWorkspaceInfo'
    });
}

function setSendEnabled(enabled) {
    const sendButton = document.getElementById('sendButton');
    const messageInput = document.getElementById('messageInput');
    
    sendButton.disabled = !enabled;
    messageInput.disabled = !enabled;
}

function scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Handle Enter key in textarea
document.getElementById('messageInput').addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});

// Auto-resize textarea
document.getElementById('messageInput').addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
});