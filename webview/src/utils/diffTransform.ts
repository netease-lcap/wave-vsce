/**
 * Tool parameter transformation utilities for UI rendering
 * Uses tool parameter types from wave-agent-sdk with type assertions based on tool name
 */

import type { ToolBlock } from 'wave-agent-sdk/dist/types/messaging.js';
import type { WriteToolParameters, EditToolParameters, MultiEditToolParameters } from 'wave-agent-sdk/dist/types/tools.js';
import { WRITE_TOOL_NAME, EDIT_TOOL_NAME, MULTI_EDIT_TOOL_NAME } from 'wave-agent-sdk/dist/constants/tools.js';

export interface Change {
  oldContent: string;
  newContent: string;
}

/**
 * Parse tool block parameters
 */
function parseToolParameters(toolBlock: ToolBlock): unknown {
  if (!toolBlock.parameters) {
    return {};
  }
  
  try {
    return JSON.parse(toolBlock.parameters);
  } catch (error) {
    console.warn("Failed to parse tool parameters:", error);
    return {};
  }
}

/**
 * Transform Write tool parameters to changes
 */
export function transformWriteParameters(parameters: WriteToolParameters): Change[] {
  // Validate required parameters
  if (!parameters || typeof parameters.content !== 'string') {
    return [];
  }
  
  return [
    {
      oldContent: "", // No previous content for write operations
      newContent: parameters.content,
    },
  ];
}

/**
 * Transform Edit tool parameters to changes
 */
export function transformEditParameters(parameters: EditToolParameters): Change[] {
  // Validate required parameters
  if (!parameters || 
      typeof parameters.old_string !== 'string' || 
      typeof parameters.new_string !== 'string') {
    return [];
  }
  
  return [
    {
      oldContent: parameters.old_string,
      newContent: parameters.new_string,
    },
  ];
}

/**
 * Transform MultiEdit tool parameters to changes
 */
export function transformMultiEditParameters(parameters: MultiEditToolParameters): Change[] {
  // Validate required parameters
  if (!parameters || !Array.isArray(parameters.edits)) {
    return [];
  }
  
  // Filter out invalid edits
  const validEdits = parameters.edits.filter(edit => 
    edit && 
    typeof edit.old_string === 'string' && 
    typeof edit.new_string === 'string'
  );
  
  return validEdits.map((edit) => ({
    oldContent: edit.old_string,
    newContent: edit.new_string,
  }));
}

/**
 * Transform tool block parameters into standardized Change[] array for diff display
 * Forces type judgment based on tool name using type assertions
 */
export function transformParametersToChanges(toolName: string, parameters: any): Change[] {
  try {
    switch (toolName) {
      case WRITE_TOOL_NAME:
        return transformWriteParameters(parameters as WriteToolParameters);
      
      case EDIT_TOOL_NAME:
        return transformEditParameters(parameters as EditToolParameters);
      
      case MULTI_EDIT_TOOL_NAME:
        return transformMultiEditParameters(parameters as MultiEditToolParameters);
      
      default:
        return [];
    }
  } catch (error) {
    console.warn("Failed to transform parameters to changes:", error);
    return [];
  }
}

/**
 * Transform tool block parameters into standardized Change[] array for diff display
 * Forces type judgment based on tool name using type assertions
 */
export function transformToolBlockToChanges(toolBlock: ToolBlock): Change[] {
  try {
    if (!toolBlock.name) {
      return [];
    }

    const parsedParams = parseToolParameters(toolBlock);
    return transformParametersToChanges(toolBlock.name, parsedParams);
  } catch (error) {
    console.warn("Failed to transform tool block to changes:", error);
    return [];
  }
}
