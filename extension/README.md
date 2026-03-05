# FileMaker Data API Tools

`FileMaker Data API Tools` is a VS Code extension for FileMaker Data API (`fmrest`) workflows: connect, browse layouts/metadata, run finds, inspect/edit records, run scripts, compare environments, and run batch jobs.

Version `0.5.1` is a patch release focused on layout-folder compatibility and packaging reliability.

## Patch Notes (0.5.1)

- Fixed layout discovery when FileMaker returns folder-based layout structures (`folderLayoutNames` / nested arrays).
- Layouts inside folders (for example under an `Assets` folder) now appear correctly in:
  - Query Builder layout picker
  - Explorer layout tree
  - Any command using `listLayouts`
- Updated VSIX packaging defaults so runtime dependencies are included.

## Install in VS Code

### Option A: Install from VSIX (recommended for normal use)

1. Download or build `filemaker-data-api-tools-0.5.1.vsix`.
2. Open VS Code.
3. Open Command Palette (`Cmd+Shift+P` on macOS / `Ctrl+Shift+P` on Windows/Linux).
4. Run `Extensions: Install from VSIX...`.
5. Select the `.vsix` file.
6. Reload VS Code when prompted.

### Option B: Run from source (for development)

```bash
npm install
npm run lint
npm run build
npm test
```

1. Open this project folder in VS Code.
2. Press `F5` to launch an Extension Development Host.
3. In the new window, run `FileMaker: Add Connection Profile` from Command Palette.

### Verify installation

1. Open Command Palette and run `FileMaker: Add Connection Profile`.
2. Open Explorer and confirm the **FileMaker Explorer** view is visible.
3. Run `FileMaker: Open Query Builder` and verify layout selection loads.

## What It Does

- Connection profiles with secure secrets in VS Code `SecretStorage`
- FileMaker Explorer tree (profiles, layouts, fields, saved queries, schema snapshots, jobs, environment sets)
- Webviews:
  - Query Builder
  - Record Viewer / Record Editor
  - Script Runner
  - Schema Diff
  - Environment Compare
  - Diagnostics Dashboard
- Data API client with token lifecycle, timeout/cancellation support, and retry-on-401
- Offline metadata mode and schema caching
- Batch export/update job workflows
- Enterprise controls (roles, policy config, feature gating)
- Plugin registry for safe extension points

No telemetry is included.

## Quickstart

```bash
npm install
npm run lint
npm run build
npm test
```

In VS Code:
1. Open this repository.
2. Press `F5` to launch the Extension Development Host.
3. Run `FileMaker: Add Connection Profile`.
4. Run `FileMaker: Connect`.
5. Run `FileMaker: Open Query Builder` and execute a find request.

## Security Model

- Passwords/tokens are stored only in `SecretStorage`.
- No plaintext credentials are written to settings/state files.
- Webviews do not call FileMaker endpoints directly; extension services execute all API calls.
- Logs, diagnostics, and history use redaction and omit record body payloads where possible.
- Copy-as snippets redact authorization headers by default.
- Role guard + workspace trust + offline mode block unsafe write paths.

## Connection Profiles

- `Direct` mode: extension talks to FileMaker Data API directly.
- `Proxy` mode: extension talks to your proxy endpoint (recommended for team/shared environments).
- Supported profile fields:
  - `serverUrl`
  - `database`
  - `authMode`
  - `username` (direct mode)
  - `apiBasePath` / `apiVersionPath`
  - `proxyEndpoint` (proxy mode)

## Troubleshooting

### HTTP 401 / token invalid

- Reconnect the profile.
- Re-enter credentials or proxy key.
- Verify server session policies.

### HTTP 403 / permission denied

- Verify FileMaker account privileges and layout/script access.
- In enterprise mode, verify role guard policy is not blocking the command.

### HTTP 404 / metadata or scripts unsupported

- Some servers/profiles do not expose every metadata/script route.
- Use fallback read-only flows and verify server/API version.

### SSL/TLS errors

- Confirm certificate trust chain on the host.
- Confirm server URL is correct and reachable from your machine.

### Workspace trust restrictions

- Untrusted workspaces disable high-risk features (file generation, plugin loading, some write flows).
- Trust the workspace to re-enable them.

## Performance Notes

- Prefer paginated find requests for large layouts.
- Use batch export in `jsonl` for large datasets.
- `high-scale` mode is optimized for large runs and constrains memory growth.
- Request history/metrics intentionally store metadata only (not full record payloads).

## Settings (Highlights)

- `filemakerDataApiTools.requestTimeoutMs`
- `filemaker.logging.level`
- `filemaker.savedQueries.scope`
- `filemaker.schema.cacheTtlSeconds`
- `filemaker.schema.snapshots.storage`
- `filemaker.schema.diagnostics.enabled`
- `filemaker.typegen.outputDir`
- `filemaker.batch.maxRecords`
- `filemaker.batch.concurrency`
- `filemaker.enterprise.mode`
- `filemaker.enterprise.role`
- `filemaker.performance.mode`
- `filemaker.offline.mode`

## Manual Test Checklist (v0.5)

- Add/edit/remove profile and connect/disconnect.
- Browse layouts and fields in explorer.
- Run find from Query Builder, export JSON and CSV, verify history updates.
- Open Record Viewer and Record Editor, validate and save with confirmation.
- Save/load/run/manage saved queries.
- Capture snapshot and run schema diff.
- Compare environment set and export report.
- Run batch export and dry-run batch update.
- Toggle offline mode and verify write gating.
- Open diagnostics dashboard and verify request metrics update.

## Test Matrix

- Unit tests:
  - stores (profiles, saved queries, history, metrics, jobs)
  - utility validation/redaction/error normalization
  - diff/typegen/performance helper logic
  - webview message guard helpers
- Integration tests (mocked HTTP):
  - list/get/find success paths
  - 401 re-auth retry
  - metadata unsupported handling
  - script execution and edit record mapping
  - timeout/abort/non-JSON error handling
  - batch export/update and environment compare paths

## Development

```bash
npm install
npm run lint
npm run build
npm test
```

See:
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [SECURITY.md](./SECURITY.md)
- [UPGRADE.md](./UPGRADE.md)
