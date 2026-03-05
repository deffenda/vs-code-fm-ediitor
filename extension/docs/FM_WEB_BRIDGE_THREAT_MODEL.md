# FM Web Bridge Threat Model

## Assets

- FileMaker data accessed through CRUD/script APIs
- Session tokens and credentials (indirectly via `FMClient`)
- Workspace-generated layout/runtime artifacts

## Trust Boundaries

- Browser runtime -> localhost bridge
- Bridge -> extension service layer
- Extension service layer -> FileMaker Data API

## Threats and Mitigations

- Remote network access:
  - Mitigation: bind bridge to `127.0.0.1` only and verify local socket addresses.
- Cross-site request forgery from arbitrary origins:
  - Mitigation: strict origin allowlist (`localhost` / `127.0.0.1`), JSON-only POST routes.
- Untrusted workspace path execution:
  - Mitigation: bridge startup and file generation require workspace trust.
- Credential leakage:
  - Mitigation: bridge never returns secrets; credentials remain in `SecretStorage`.
- Resource exhaustion:
  - Mitigation: request body size cap and per-route timeout/abort behavior.
