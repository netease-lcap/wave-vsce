<!--
SYNC IMPACT REPORT - 2025-01-17
Version: 1.0.0 → 1.1.0 (Test file organization standardization)
Modified Principles: Added VI. Test File Organization
Added Sections: Test File Organization requirements
Deleted Sections: None
Template Updates:
- ✅ plan-template.md: Constitution checks aligned with TDD principles
- ✅ spec-template.md: Acceptance criteria aligned with test-first approach  
- ✅ tasks-template.md: Test tasks mandatory for all user stories with TDD sequencing
- ✅ checklist-template.md: No changes needed (generic)
- ✅ agent-file-template.md: No changes needed (auto-generated)
Implementation Changes:
- ✅ All test files moved from src/ to __tests__/ directory
- ✅ Jest configuration updated to only look in __tests__/
- ✅ Test imports updated to use absolute paths with @/ alias
Delayed TODOs: None
-->

# Hot One Constitution

## Core Principles

### I. Test-First Development (NON-NEGOTIABLE)
Every feature implementation MUST follow strict Test-Driven Development (TDD):
- Tests written first based on acceptance criteria from specs
- Tests MUST fail initially (red phase)
- Implementation follows to make tests pass (green phase)
- Code refactoring only after tests pass (refactor phase)
- No code ships without comprehensive test coverage

**Rationale**: Test-first ensures code quality, prevents regression bugs, and validates that implementation meets user requirements before development begins.

### II. User Story Isolation
Each user story MUST be independently testable and deliverable:
- Stories can be developed in parallel without dependencies
- Each story provides standalone business value
- Test suites organized by user story for clear traceability
- Integration points explicitly tested between stories

**Rationale**: Independent stories enable incremental delivery, parallel development, and easier debugging when issues arise.

### III. TypeScript Strictness
All code MUST use TypeScript with strict type checking:
- No `any` types without explicit justification
- All function parameters and return types explicitly typed
- Zod schemas for runtime validation at API boundaries
- Type safety maintained across Next.js App Router patterns

**Rationale**: TypeScript strictness catches errors at compile time, improves code maintainability, and provides better developer experience with IDE support.

### IV. API Contract Testing
All API endpoints MUST have contract tests:
- Request/response schema validation
- Error condition coverage
- Authentication and authorization verification
- Database transaction rollback on test completion

**Rationale**: Contract tests ensure API reliability and prevent breaking changes from reaching production.

### V. Component Testing Strategy
React components MUST have comprehensive test coverage:
- Unit tests for component logic and rendering
- Integration tests for user interactions
- Accessibility testing for all interactive elements
- Mock external dependencies to isolate component behavior

**Rationale**: Component tests ensure UI reliability and prevent user experience degradation.

### VI. Test File Organization
All test files MUST be organized in the root `__tests__` directory:
- Test files mirror the source directory structure under `__tests__/`
- No test files allowed in source directories (`src/`)
- Jest configuration only looks for tests in `__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}`
- Imports use absolute paths with `@/` alias for consistency

**Rationale**: Centralized test organization improves maintainability and prevents accidental test files in production bundles.

## Development Workflow

### Code Review Requirements
All code changes MUST pass:
- Automated test suite (no failing tests)
- TypeScript compilation without errors
- ESLint and Prettier formatting checks
- Manual code review focusing on test quality and coverage

### Feature Development Process
1. **Specification Phase**: User stories with acceptance criteria written
2. **Test Design Phase**: Test cases written based on acceptance criteria
3. **Red Phase**: Tests written and confirmed failing
4. **Green Phase**: Minimal code written to pass tests
5. **Refactor Phase**: Code improved while maintaining test passage
6. **Integration Phase**: Feature tested with existing system

## Quality Gates

### Pre-Deployment Checklist
- [ ] All tests passing (unit, integration, component)
- [ ] TypeScript compilation successful
- [ ] No ESLint errors or warnings unaddressed
- [ ] Database migrations tested and reversible
- [ ] API endpoints documented with examples
- [ ] User stories verified through acceptance tests

### Performance Standards
- Next.js build completes without warnings
- API response times under 200ms for standard operations
- Client-side bundle size monitored and optimized
- Database queries optimized with proper indexing

## Governance

### Constitution Authority
This constitution supersedes all other development practices and guidelines. Any conflicts between this document and other practices must be resolved in favor of constitutional requirements.

### Amendment Process
Constitution changes require:
1. Documented justification for the change
2. Impact analysis on existing workflows
3. Migration plan for affected code and processes
4. Team review and approval
5. Version increment following semantic versioning

### Compliance Verification
All pull requests MUST verify compliance with constitutional principles. Reviewers must confirm:
- TDD process was followed with evidence of red-green-refactor cycle
- Test coverage meets quality standards
- TypeScript strictness maintained
- User story independence preserved

**Version**: 1.1.0 | **Ratified**: 2025-10-18 | **Last Amended**: 2025-01-17