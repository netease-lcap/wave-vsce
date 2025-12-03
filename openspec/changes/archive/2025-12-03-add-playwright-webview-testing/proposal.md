# Change: Add Playwright Support for Webview Testing

## Why

The VS Code extension currently relies on manual testing for webview functionality, which is insufficient for ensuring reliable chat interface behavior. Automated testing of the webview is needed to:

- Verify message display and interaction flows
- Test real-time streaming behavior and abort functionality  
- Validate UI components like buttons, input fields, and message formatting
- Ensure proper communication between webview and extension
- Catch regressions in chat interface behavior during development

## What Changes

- Add Playwright testing framework to test webview content in isolation
- Create mock agent data structures based on real agent behavior
- Implement test utilities for webview message simulation
- Add major smoke tests for critical chat interface scenarios
- Integrate Playwright tests into development workflow

## Impact

- Affected specs: vscode-chat (test coverage requirements)
- Affected code: 
  - package.json (new dev dependencies)
  - New test/ directory with Playwright configuration and tests
  - webview/ files (potential test data attributes)
  - Integration with existing test-extension.js workflow