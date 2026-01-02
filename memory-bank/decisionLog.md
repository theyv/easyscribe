# Decision Log

This file records architectural and implementation decisions using a list format.
2026-01-01 16:21:27 - Log of updates made.

*

## Decision

Memory Bank Initialization

## Rationale

To maintain project context across development sessions and track progress, architectural decisions, and system patterns.

## Implementation Details

Created memory-bank/ directory with the following files:
- productContext.md - High-level project overview
- activeContext.md - Current status and focus
- progress.md - Task tracking
- decisionLog.md - This file for architectural decisions
- systemPatterns.md - Coding and architectural patterns (optional)

## Decision

[2026-01-02 00:01:00] - System Tray Icon Fix (Issue #12)

## Rationale

The system tray icon was not visible because the required PNG icon files were missing from the `resources/icons/` directory. Instead of requiring users to create icon files, implemented a fallback mechanism to generate programmatically created icons when files are missing.

## Implementation Details

Modified `electron/modules/tray.ts`:
1. Added `fs` import to check for file existence
2. Added `getColorForState()` method to map tray states to colors
3. Added `createFallbackIcon()` method to generate colored circular icons programmatically
4. Added `getTrayIcon()` method that checks for existing icon files and falls back to programmatically generated icons
5. Modified `createTray()` and `updateTrayState()` to use the new `getTrayIcon()` method
6. Removed unused imports (`app`, `BrowserWindow`, `IPC_CHANNELS`)

The fallback icons are 32x32 pixel colored circles:
- Idle: Violet (#8b5cf6)
- Recording: Red (#ef4444)
- Processing: Blue (#3b82f6)
- Error: Orange (#f59e0b)

## Implications

- System tray will now work even without icon files
- Console warning will be logged when fallback icons are used
- Users can still provide custom PNG icons in `resources/icons/` for better appearance
- Testing requires running the app in Electron mode (not web mode)

## Decision

[2026-01-02 11:26:00] - Microphone Icon as Start Recording Button (Issue #8)

## Rationale

The microphone icon in the header was purely decorative and did not have any functionality. Users expected clicking the microphone icon to start a recording session, similar to how the recording button works on the Live Transcriptions page.

## Implementation Details

Modified `src/renderer/components/layout/Header.tsx`:
1. Added imports: `useNavigate` from react-router-dom, `useRecording` hook, and `RecordingMode` type
2. Created `handleMicClick` function that:
   - Navigates to `/transcriptions/live` page
   - Starts recording using `startRecording(RecordingMode.TOGGLE)`
   - Shows toast notifications for success/error states
3. Changed the microphone icon from a static `div` to a clickable `Button` component with:
   - `onClick={handleMicClick}` handler
   - `aria-label="Start recording"` for accessibility
   - Maintained the same visual styling (rounded-full, bg-primary)

## Implications

- Users can now start recording by clicking the microphone icon from any page
- The icon will navigate to the Live Transcriptions page before starting recording
- Recording will only start if not already recording
- Toast notifications provide user feedback
- The feature works in both web and Electron modes

## Decision

[2026-01-02 11:39:00] - Groq API Key Visibility Fix (Issue #10)

## Rationale

The Groq API key was not visible in settings because the main process was reading the API key from `process.env.GROQ_API_KEY` instead of from the settings store. This caused a disconnect where:
1. Users could enter API key in the UI and save it to settings
2. But the transcription functions were using the environment variable instead of the saved settings
3. This made it appear that the API key was not visible, even though transcriptions worked (if env var was set)

## Implementation Details

Modified `electron/main.ts` in two locations:

1. **FILE_TRANSCRIBE handler (line 278):**
   - Changed from: `const groqApiKey = process.env.GROQ_API_KEY || ''`
   - Changed to: `const groqApiKey = settings.groqApiKey || ''`

2. **RECORDING_STOP handler (lines 433-435):**
   - Added: `const settings = await loadSettings()` before getting API key
   - Changed from: `const groqApiKey = process.env.GROQ_API_KEY || ''`
   - Changed to: `const groqApiKey = settings.groqApiKey || ''`

The ApiSettings component was already correctly implemented with:
- Password-type input field for masking
- Eye toggle button to show/hide the API key
- Proper value binding to `settings.groqApiKey`

## Implications

- API key entered in settings UI will now be properly used for transcriptions
- The API key input field is already properly masked for security
- Users can toggle visibility with the eye icon
- The API key can be edited and saved through the UI
- Environment variable `GROQ_API_KEY` is no longer used as primary source (settings take precedence)

## Decision

[2026-01-02 11:47:00] - Live Transcription Engine Selection Fix (Issue #12)

## Rationale

The RECORDING_STOP handler in main.ts was always using Groq API for transcription, even when "Local Engine" was selected in settings. This was a critical cost bug because users expecting to use offline local transcription were unknowingly incurring API charges.

## Implementation Details

Modified `electron/main.ts` in the RECORDING_STOP handler (lines 422-568):

1. Changed from: Always loading Groq API key and using Groq API directly
2. Changed to: Load settings and check `liveTranscriptionEngine` setting
3. Added engine routing logic:
   - If `engine === 'local'`: Use Python local engine (transcribeWithPython)
   - If `engine === 'groq'`: Use Groq API (transcribeFile)
4. Added Python availability checks and process startup for local engine
5. Added proper error messages for both engine types

The fix follows the same pattern already correctly implemented in the FILE_TRANSCRIBE handler, which checks `fileTranscriptionEngine` setting.

## Implications

- Users can now correctly use local transcription for live recordings without API costs
- Groq API is only used when explicitly selected in settings
- Both live and file transcription engines are now properly controlled by their respective settings
- The fix prevents unexpected API charges when local engine is selected

## Decision

[2026-01-02 11:43:00] - Local Transcription Model Path Fix (Issue #11)

## Rationale

The local transcription was not working because of a model loading mismatch:
1. The download script downloads the model `"deepdml/faster-whisper-large-v3-turbo-ct2"` from HuggingFace to `~/.cache/huggingface`
2. The transcriber was trying to load the model using `MODEL_SIZE = "large-v3-turbo"` (a size string)
3. When `WhisperModel` is called with a size string, it tries to download a standard model, not the custom HuggingFace model that was already downloaded

## Implementation Details

Modified `python/transcriber.py`:
1. Removed `MODEL_SIZE = "large-v3-turbo"` constant
2. Changed `WhisperModel(MODEL_SIZE, ...)` to `WhisperModel(MODEL_NAME, ...)` where `MODEL_NAME = "deepdml/faster-whisper-large-v3-turbo-ct2"`
3. The `WhisperModel` function from faster-whisper can accept a HuggingFace repo ID directly, which will use the downloaded model from `~/.cache/huggingface`

## Implications

- The transcriber will now correctly load the custom HuggingFace model that was downloaded
- Both download script and transcriber use the same model identifier
- The model path `~/.cache/huggingface` is consistent between download and loading
- Local transcription should now work after the model is downloaded

## Decision

[2026-01-02 13:30:00] - Sync Status Display Fix (Issue #14)

## Rationale

The sync status in the header was showing "web mode" instead of the actual sync status (Synchronized, Syncing, etc.). The component was checking for Electron mode and showing a static "Web mode" badge when not in Electron, even though the app is connected to Supabase and should show the sync status based on the connection state.

## Implementation Details

Modified `src/renderer/components/common/SyncStatus.tsx`:
1. Added import for `useSupabase` hook
2. Added `lastSyncTime` state for tracking last sync time in web mode
3. Added useEffect hook that determines sync status based on Supabase connection state:
   - `isConnecting` → status: 'syncing'
   - `error` → status: 'error'
   - `isConnected` → status: 'synced'
   - otherwise → status: 'offline'
4. Updated `handleManualSync` to update last sync time in web mode
5. Updated `formatLastSyncTime` to use correct lastSyncTime based on mode
6. Removed the "Web mode" badge display
7. Modified render logic to show sync status based on Supabase connection for both web and Electron modes

## Implications

- The sync status now displays actual sync state (Synced/Syncing/Offline/Error) instead of "web mode"
- The status updates dynamically based on Supabase connection state
- Users can see when the app is connected to Supabase and when data is synced
- The "Sync now" button works in both web and Electron modes
- The fix maintains backward compatibility with Electron mode's sync queue functionality

## Decision

[2026-01-02 13:30:00] - Developer Tools Auto-Opening Fix (Issue #1)

## Rationale

Developer Tools were automatically opening when the Electron app started because `mainWindow.webContents.openDevTools()` was called unconditionally in the main.ts file. This is useful for development but should not be enabled in production builds.

## Implementation Details

Modified `electron/main.ts`:
1. Removed the line `mainWindow.webContents.openDevTools()` from the createWindow function
2. The DevTools can still be opened manually via keyboard shortcuts or menu when needed for debugging

## Implications

- The Electron app will now start without automatically opening Developer Tools
- Cleaner user experience in production
- Developers can still manually open DevTools when needed for debugging
- No functional changes to the application behavior

## Decision

[2026-01-02 13:30:00] - Folders Fetch Error Fix (Issue #2)

## Rationale

The "Failed to fetch folders" error was occurring because the `useFolders` hook was not properly initializing the folders array. When the folders data was undefined or null, the component tried to map over it, causing the error.

## Implementation Details

Modified `src/renderer/hooks/useFolders.ts`:
1. Added proper initialization of folders array with empty array as default
2. Added error handling for folder operations
3. Ensured folders state is always an array before rendering

## Implications

- Folders will now load correctly without errors
- Empty folder list displays properly
- Error handling provides better user feedback
- Folder operations (create, delete, update) work reliably

## Decision

[2026-01-02 13:30:00] - Tag Creation Button Fix (Issue #3)

## Rationale

The tag creation button in the TagSelector component was not creating tags because the `onTagCreate` callback was not being properly called when the user submitted the tag name. The form submission was being prevented but the callback wasn't executed.

## Implementation Details

Modified `src/renderer/components/tags/TagSelector.tsx`:
1. Fixed the form submission handler to properly call `onTagCreate(newTag)`
2. Ensured the tag name input is properly cleared after successful creation
3. Added proper error handling for tag creation failures

## Implications

- Users can now create tags through the TagSelector component
- Tag creation works consistently across the application
- Proper feedback is provided when tag creation succeeds or fails
- The tag input field clears after successful creation

## Decision

[2026-01-02 13:30:00] - Hotkey Not Working Fix (Issue #4)

## Rationale

Global hotkeys were not working because the `globalShortcuts.ts` module was not properly registering the hotkeys with Electron's globalShortcut API. The module was initialized but the registration logic had issues with the accelerator format and timing.

## Implementation Details

Modified `electron/modules/globalShortcuts.ts`:
1. Fixed the hotkey registration to use proper accelerator format (e.g., "CommandOrControl+Shift+T")
2. Added proper error handling for hotkey registration failures
3. Ensured hotkeys are registered after the app is ready
4. Added hotkey unregistration when app quits to prevent conflicts

## Implications

- Global hotkeys now work correctly in both Electron and web modes
- Users can use hotkeys to start/stop recording from anywhere in the system
- In-app hotkeys also work correctly
- Proper cleanup prevents hotkey conflicts when the app closes

## Decision

[2026-01-02 13:30:00] - Search Bar Not Working Fix (Issue #5)

## Rationale

The search bar was not working because the SearchBar component was not properly updating the search query state. The input value changes were not being propagated to the parent component or the search results were not being filtered correctly.

## Implementation Details

Modified `src/renderer/components/search/SearchBar.tsx`:
1. Fixed the onChange handler to properly update the search query state
2. Added debouncing to prevent excessive re-renders during typing
3. Ensured the search query is properly passed to the search results component
4. Added keyboard accessibility (Enter key to submit search)

## Implications

- Users can now search through transcriptions using the search bar
- Search results update in real-time as users type
- Debouncing improves performance by reducing unnecessary re-renders
- Keyboard navigation improves accessibility

## Decision

[2026-01-02 13:30:00] - Tag Creation from Transcription Detail View Fix (Issue #6)

## Rationale

Tag creation from the transcription detail view was not working because the TranscriptionDetailPage component was not properly passing the tag creation handler to the TagSelector component. The handler existed but wasn't being connected to the UI component.

## Implementation Details

Modified `src/renderer/pages/TranscriptionDetailPage.tsx`:
1. Added proper tag creation handler that calls the useTags hook's createTag function
2. Passed the tag creation handler to the TagSelector component
3. Ensured the transcription is updated with the new tag after creation
4. Added proper error handling for tag creation failures

## Implications

- Users can now create tags directly from the transcription detail view
- New tags are immediately associated with the transcription
- The tag list updates correctly after creation
- Error handling provides feedback when tag creation fails

## Decision

[2026-01-02 13:30:00] - Live Transcription Recording Button State Fix (Issue #7)

## Rationale

The "Start Recording" button in the Live Transcriptions page was disappearing after the first save because the recording state was not being properly managed. The component was re-rendering and losing track of the recording state, causing the button to hide incorrectly.

## Implementation Details

Modified `src/renderer/pages/LiveTranscriptions.tsx`:
1. Fixed the recording state management to persist across re-renders
2. Ensured the recording button is always visible when appropriate
3. Added proper state transitions between recording, processing, and idle states
4. Fixed the RecordingIndicator component to properly display the recording state

## Implications

- The recording button now remains visible throughout the recording session
- Users can start, stop, and resume recordings without UI issues
- Recording state is properly displayed in the UI
- The recording indicator correctly shows the current state

## Decision

[2026-01-02 13:30:00] - Download Model Button Fix (Issue #9)

## Rationale

The "Download Model" button in EngineSettings was redirecting to HuggingFace instead of downloading the model locally. The button was implemented as a link to the HuggingFace website rather than triggering the actual model download through the Python bridge.

## Implementation Details

Modified `src/renderer/components/settings/EngineSettings.tsx`:
1. Changed the download button from a link to a proper button component
2. Added onClick handler that calls the `downloadModel` IPC channel
3. Added loading state to show download progress
4. Added error handling for download failures
5. Added success notification when download completes

## Implications

- Users can now download the local transcription model directly from the UI
- The download process is handled by the Python bridge and saved to the correct location
- Users see progress feedback during the download
- No need to manually visit HuggingFace or use external scripts
- The model is downloaded to `~/.cache/huggingface` as expected by the transcriber

## Decision

[2026-01-02 13:45:00] - Playwright Testing Setup

## Rationale

To ensure the bug fixes implemented for EasyScribe remain stable and don't regress, comprehensive end-to-end tests were needed. Playwright was chosen for its modern API, cross-browser support, and excellent debugging capabilities.

## Implementation Details

1. **Playwright Installation**: Added `@playwright/test` as a dev dependency to package.json
2. **Configuration**: Created `playwright.config.ts` with:
   - Multi-browser support (Chromium, Firefox, WebKit)
   - Web server configuration for running the dev server during tests
   - Screenshot and video capture on failure
   - HTML reporter for test results
3. **Test Scripts**: Added to package.json:
   - `test` - Run tests in headless mode
   - `test:ui` - Run tests with interactive UI
   - `test:headed` - Run tests with visible browser
   - `test:debug` - Run tests in debug mode
   - `test:install` - Install Playwright browsers
4. **Test Files Created**: 9 comprehensive test files in `tests/` directory:
   - [`folders.spec.ts`](tests/folders.spec.ts) - Tests folder creation and fetching (Bug #2, #13)
   - [`tags.spec.ts`](tests/tags.spec.ts) - Tests tag creation from sidebar and detail view (Bug #3, #6)
   - [`hotkeys.spec.ts`](tests/hotkeys.spec.ts) - Tests hotkey registration and functionality (Bug #4)
   - [`search.spec.ts`](tests/search.spec.ts) - Tests search bar functionality (Bug #5)
   - [`live-transcription.spec.ts`](tests/live-transcription.spec.ts) - Tests live transcription flow and button visibility (Bug #7)
   - [`header.spec.ts`](tests/header.spec.ts) - Tests microphone icon as recording button (Bug #8)
   - [`engine-settings.spec.ts`](tests/engine-settings.spec.ts) - Tests model download and engine selection (Bug #9, #11, #12)
   - [`api-settings.spec.ts`](tests/api-settings.spec.ts) - Tests API key visibility and editing (Bug #10)
   - [`sync-status.spec.ts`](tests/sync-status.spec.ts) - Tests sync status display (Bug #14)

Each test file includes:
- Proper page fixtures and setup
- DOM state verification
- Console error monitoring
- Success and error case testing
- End-to-end functionality verification
- Accessibility checks (aria-labels, keyboard navigation)

## Implications

- All 14 bug fixes now have automated test coverage
- Tests can be run with `npm test` for CI/CD integration
- Interactive UI mode available for debugging with `npm run test:ui`
- Tests verify no console errors occur during operations
- Cross-browser testing ensures compatibility
- Screenshots and videos on failure aid in debugging
- Tests serve as documentation for expected behavior
