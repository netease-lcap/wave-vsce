# Project Context

## Purpose
VS Code extension providing a chat interface to interact with AI agents for project assistance, code writing, and file modifications.

## Tech Stack
- TypeScript
- VS Code Extension API
- HTML/CSS/JavaScript for webview
- wave-agent-sdk (installed via npm)

## Project Conventions

### Code Style
- TypeScript with strict mode
- ESLint for code formatting
- Consistent naming: camelCase for variables, PascalCase for classes

### Architecture Patterns
- Extension follows VS Code extension patterns
- Webview for UI with message passing
- Agent SDK integration with callback pattern

### Testing Strategy
- Manual testing during development
- VS Code extension testing framework for automated tests

### Git Workflow
- Feature branch workflow
- Conventional commits

## Domain Context
VS Code extension development with AI agent integration. Users interact via chat to get help with their current workspace.

## Important Constraints
- Must work within VS Code extension security model
- Webview content security policies apply
- Uses published wave-agent-sdk package

## External Dependencies
- wave-agent-sdk: Published npm package (^0.0.8)
- VS Code Extension API
