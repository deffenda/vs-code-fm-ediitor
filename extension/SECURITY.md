# Security Policy

## Threat Model Summary

Primary risks addressed by this extension:
- credential leakage (profiles, tokens, API keys)
- unsafe write operations
- unsafe plugin execution in untrusted workspaces
- sensitive data exposure in logs/history/diagnostics
- webview message/script injection vectors

## Secret Handling

- Passwords/session tokens/proxy keys are stored in VS Code `SecretStorage` only.
- Secrets are not persisted in settings or workspace state.
- Webviews never receive credentials and never call FileMaker endpoints directly.

## Logging and Diagnostics

- Redaction is applied for known sensitive keys/headers/token patterns.
- Request history/metrics are metadata-focused and avoid full record body storage where possible.

## Workspace Trust

- High-risk operations are restricted in untrusted workspaces.
- Offline/read-only paths remain available where safe.

## Vulnerability Reporting

For security issues, report privately to: `security@example.com` (placeholder).

Please include:
- affected version
- reproduction steps
- impact assessment
- suggested mitigation (if known)
