# System Patterns *Optional*

This file documents recurring patterns and standards used in the project.
It is optional, but recommended to be updated as the project evolves.
2026-01-01 16:21:43 - Log of updates made.

*

## Coding Patterns

- TypeScript strict mode enabled for type safety
- Functional components with hooks
- Zustand for state management
- Custom hooks for reusable logic
- shadcn/ui component library for UI elements

## Architectural Patterns

- Electron main process modules in `electron/modules/`
- Renderer components organized by feature
- Shared types and constants in `src/shared/`
- IPC communication for main-renderer communication
- Python bridge for audio processing

## Testing Patterns

- Playwright for end-to-end testing
- Tests organized by feature/component in `tests/` directory
- Each test file covers specific bug fixes
- Console error monitoring in all tests
- DOM state verification for UI updates
- Accessibility checks (aria-labels, keyboard navigation)
- Multi-browser testing (Chromium, Firefox, WebKit)
- Screenshot and video capture on test failure
- HTML reporter for test results
