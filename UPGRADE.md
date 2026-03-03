# Upgrade Guide: v0.4 -> v0.5

v0.5 is a hardening release. No major end-user feature additions were introduced.

## What Changed

- Version bumped to `0.5.0`.
- Shared error model and consistent command UX (`Details…` on errors).
- Shared redaction utility applied across logging/history/error-details.
- Centralized settings reads and validation via `settingsService`.
- Stronger input/path validation for profile and generation flows.
- Webview CSP/message-validation hardening.
- Expanded test suite for error normalization/redaction/settings/message guards.

## Settings Notes

No required setting renames for v0.5.

Behavioral improvements:
- invalid setting values are clamped/fallback to safe defaults.
- untrusted workspace can force safer snapshot storage defaults.

## Migration Notes for Contributors

- Prefer `SettingsService` for new config access.
- Use `showErrorWithDetails`/`showCommandError` in command handlers.
- Use `normalizeError` and `redact` utilities instead of local logic.
- Use `webviews/common/csp.ts` and `webviews/common/messageValidation.ts` for new webviews.

## Potentially Visible Behavior Changes

- Some error messages may be slightly different due to normalized mapping.
- Invalid profile data loaded from stored state is ignored during hydration.
- Path traversal-like output paths now fall back to safe directories.
