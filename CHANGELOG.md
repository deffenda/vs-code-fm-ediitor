# Changelog

## 0.5.1

- Fixed layout parsing for folder-based FileMaker layout payloads:
  - nested folder nodes are now flattened into selectable layout names
  - layouts under folders (for example `Assets`) now resolve correctly in Query Builder and Explorer
- Added tests for folder/nested layout parsing:
  - unit coverage for mixed layout structures
  - integration coverage for mocked `/layouts` folder responses
- Fixed VSIX packaging defaults:
  - removed `--no-dependencies` from package script to avoid missing runtime modules in installed VSIX files

## 0.5.0

- Quality/hardening release (no major new user-facing feature set).
- Added centralized settings service:
  - defaulting and validation/clamping for key settings
  - trust-aware defaults for snapshot storage/file output flows
- Added shared error infrastructure:
  - typed normalized error model (`src/types/errors.ts`)
  - shared `normalizeError()` utility
  - shared command error UX helper with `Details…` JSON document
- Added shared redaction utility and migrated logging call sites:
  - centralized token/password/header redaction
  - history/job/log pathways aligned on common redaction behavior
- Hardened webviews:
  - common CSP nonce builder
  - message validation helpers for inbound postMessage payloads
  - stricter CSP usage across webview surfaces
- Hardened data client behavior:
  - broader normalized error mapping (auth/server/network/timeout/cancellation)
  - cancellable proxy calls and improved propagation of abort signals
- Validation/sanitization improvements:
  - stronger profile input validation (URL/database/profile IDs)
  - safer output path/file-name handling for generated artifacts
- Testing expansion:
  - new unit tests for normalizeError, redact, settingsService, message validation
  - additional unit/integration coverage for fmClient headers and timeout/abort/non-JSON handling
- CI updates:
  - format check step
  - package validation step
  - stricter lint gate (`--max-warnings=0`)
- Documentation overhaul:
  - refreshed README and ARCHITECTURE
  - added CONTRIBUTING, SECURITY, UPGRADE guides

## 0.4.0

- Added enterprise governance foundations:
  - environment sets (`create/list/store`) for grouped profile workflows
  - cross-environment comparison service with layout presence matrix
  - layout diff across environments with field-level drift output
  - comparison export to JSON/Markdown
  - environment set explorer section and commands
- Added role-based feature controls:
  - `filemaker.enterprise.mode` and `filemaker.enterprise.role`
  - command-layer restriction enforcement (viewer/developer/admin)
  - locked profile handling via enterprise config policy
  - enterprise config parsing from `.vscode/filemaker.config.json`
- Added observability and diagnostics:
  - request tracing with `requestId`
  - rolling metrics store (latency, success/failure, re-auth, cache hit)
  - diagnostics dashboard webview
  - logger support for `filemaker.logging.level`
- Added high-scale performance hardening:
  - `filemaker.performance.mode`
  - high-scale batch export behavior (JSONL-first)
  - adaptive concurrency controller
  - retry/backoff for 429/5xx
  - circuit-breaker protection for repeated batch-update failures
- Added plugin architecture:
  - plugin contracts (`pluginTypes`)
  - plugin lifecycle and loading registry
  - internal + trusted workspace plugin loading
  - safe plugin API wrapper without SecretStorage exposure
  - plugin commands (`Reload Plugins`, `List Active Plugins`)
- Added offline metadata mode:
  - `filemaker.offline.mode`
  - persistent metadata cache store under `.vscode/filemaker/offline-metadata`
  - explorer offline badge
  - toggle offline mode and refresh cache commands
  - schema service cache fallback in offline mode
- Updated explorer structure:
  - `Environment Sets` root
  - `OFFLINE MODE` badge root item when enabled
- Expanded test coverage:
  - unit tests for role guard, environment compare, metrics, adaptive concurrency, circuit breaker, plugin registry, environment set store
  - integration tests for environment compare, offline mode, high-scale export behavior, role guard restrictions

## 0.3.0

- Added schema snapshots and schema diff workflows:
  - capture snapshots per profile/layout
  - workspaceState or workspace-files storage backend
  - diff two snapshots or diff current metadata vs latest snapshot
  - schema diff webview with added/removed/changed sections
  - optional Problems diagnostics publishing for drift detection
- Added type/snippet generation:
  - TypeScript layout artifacts generated into configurable output folder
  - field-name sanitization + mapping constants
  - metadata hash header for rerunnable generation traceability
  - VS Code snippet generation for find/get-record flows
- Added record editing write-back support:
  - new Record Editor webview
  - draft validation + dirty-state handling
  - preview patch JSON before save
  - partial update save via Data API edit endpoint
  - explicit save confirmation with rollback guidance
- Added batch operations + job runner:
  - batch find export with pagination (JSONL/CSV)
  - batch update from CSV/JSON with dry-run default
  - bounded concurrency execution and cancellation support
  - job progress/status tracking + status bar integration
  - persisted recent job summaries
- Hardening improvements:
  - improved cache keys (profile/database/api path aware)
  - best-effort ETag handling for metadata fetches
  - workspace trust gating for file-output and batch features
  - expanded settings surface for v0.3 features
- Added CI workflow:
  - npm install, lint, test, build
  - optional packaging step on tags
- Added tests:
  - unit tests for schema diff, name sanitize, type generation, job runner
  - integration tests for editRecord, snapshot+diff, batch export and batch update behavior

## 0.2.0

- Added Saved Queries v2:
  - workspace/global scope setting
  - schema versioning + migration from v0.1 format
  - run/open/manage/delete/export/import commands
  - explorer integration under profile nodes
- Added schema/field metadata browser:
  - `Fields` tree under layouts
  - metadata cache with TTL
  - graceful unsupported handling
  - refresh schema cache command
- Added Script Runner webview + command:
  - run scripts with layout/context inputs
  - copy as curl/fetch helpers
  - unsupported detection and UI guardrails
- Upgraded Query Builder:
  - load saved query defaults
  - save current query command integration
  - export JSON to editor/file and CSV to file
  - history panel
  - copy as curl/fetch with auth-inclusion toggle
- Added request history store + command (`Show Request History`)
- Added utilities:
  - JSON validation helper
  - CSV exporter
  - snippet generator with default auth redaction
- Added/expanded tests:
  - saved queries store
  - JSON validation
  - snippet redaction
  - CSV escaping
  - history ring buffer
  - schema metadata integration
  - script runner integration
  - saved query run integration

## 0.1.0

- Initial MVP release:
  - Connection profiles with secure secret handling
  - FileMaker Explorer tree view (profiles + layouts)
  - Query Builder and Record Viewer webviews
  - FileMaker Data API client with token lifecycle and 401 retry
  - Direct and proxy auth modes
  - Unit and integration tests (mocked HTTP)
