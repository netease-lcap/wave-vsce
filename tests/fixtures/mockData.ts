import type { Message, TextBlock, ToolBlock, ErrorBlock, MessageBlock } from 'wave-agent-sdk';

/**
 * Mock data generators for testing webview functionality
 * Based on actual wave-agent-sdk data structures
 */

export class MockDataGenerator {
    /**
     * Create a basic user message
     */
    static createUserMessage(content: string): Message {
        const textBlock: TextBlock = {
            type: "text",
            content: content
        };

        return {
            role: "user",
            blocks: [textBlock]
        };
    }

    /**
     * Create a basic assistant message with text content
     */
    static createAssistantMessage(content: string): Message {
        const textBlock: TextBlock = {
            type: "text",
            content: content
        };

        return {
            role: "assistant", 
            blocks: [textBlock]
        };
    }

    /**
     * Create an assistant message with a tool call
     */
    static createAssistantMessageWithTool(textContent: string, toolName: string, toolParams: string, toolResult?: string): Message {
        const blocks: MessageBlock[] = [];

        if (textContent) {
            blocks.push({
                type: "text",
                content: textContent
            } as TextBlock);
        }

        const toolBlock: ToolBlock = {
            type: "tool",
            name: toolName,
            parameters: toolParams,
            compactParams: toolName === "Read" ? "file.ts" : 
                          toolName === "Write" ? "config.json" : 
                          toolName === "Bash" ? "npm install" : 
                          `${toolName.toLowerCase()}`,
            result: toolResult,
            stage: toolResult ? "end" : "running",
            success: toolResult ? true : undefined,
            id: `tool_${Date.now()}`
        };

        blocks.push(toolBlock);

        return {
            role: "assistant",
            blocks: blocks
        };
    }

    /**
     * Create an error message
     */
    static createErrorMessage(errorContent: string): Message {
        const errorBlock: ErrorBlock = {
            type: "error",
            content: errorContent
        };

        return {
            role: "assistant",
            blocks: [errorBlock]
        };
    }

    /**
     * Create a streaming message (partial content)
     */
    static createStreamingMessage(accumulatedContent: string): Message {
        const textBlock: TextBlock = {
            type: "text", 
            content: accumulatedContent
        };

        return {
            role: "assistant",
            blocks: [textBlock]
        };
    }

    /**
     * Create an assistant message with a file editing tool (Edit, Write, MultiEdit)
     * that should trigger diff display
     */
    static createAssistantMessageWithFileEdit(
        textContent: string,
        toolName: 'Edit' | 'Write' | 'MultiEdit',
        filePath: string,
        editParams: any,
        stage: 'running' | 'end' = 'end'
    ): Message {
        const blocks: MessageBlock[] = [];

        if (textContent) {
            blocks.push({
                type: "text",
                content: textContent
            } as TextBlock);
        }

        const toolBlock: ToolBlock = {
            type: "tool",
            name: toolName,
            parameters: JSON.stringify({
                file_path: filePath,
                ...editParams
            }),
            compactParams: filePath,
            stage: stage,
            success: stage === 'end' ? true : undefined,
            id: `${toolName.toLowerCase()}_${Date.now()}`
        };

        blocks.push(toolBlock);

        return {
            role: "assistant",
            blocks: blocks
        };
    }

    /**
     * Create a simple Edit tool message
     */
    static createEditToolMessage(filePath: string, oldString: string, newString: string): Message {
        return this.createAssistantMessageWithFileEdit(
            `Editing ${filePath}:`,
            'Edit',
            filePath,
            { old_string: oldString, new_string: newString }
        );
    }

    /**
     * Create a simple Write tool message
     */
    static createWriteToolMessage(filePath: string, content: string): Message {
        return this.createAssistantMessageWithFileEdit(
            `Writing new file ${filePath}:`,
            'Write',
            filePath,
            { content: content }
        );
    }

    /**
     * Create a MultiEdit tool message
     */
    static createMultiEditToolMessage(filePath: string, edits: Array<{old_string: string, new_string: string}>): Message {
        return this.createAssistantMessageWithFileEdit(
            `Making multiple edits to ${filePath}:`,
            'MultiEdit',
            filePath,
            { edits: edits }
        );
    }
    static createSampleConversation(): Message[] {
        return [
            this.createUserMessage("Hello, can you help me with my project?"),
            this.createAssistantMessage("Hello! I'd be happy to help you with your project. What would you like to know?"),
            this.createUserMessage("Can you read the package.json file?"),
            this.createAssistantMessageWithTool(
                "I'll read the package.json file for you.", 
                "Read",
                '{"file_path": "/project/package.json"}',
                '{"name": "test-project", "version": "1.0.0"}'
            )
        ];
    }
}