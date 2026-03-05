# FM Web Security Model

## Principles

- Credentials remain in `SecretStorage`.
- Browser/runtime traffic never includes raw DB credentials.
- Bridge API is localhost-only and workspace-trust gated.

## Enforcement

- The bridge binds to `127.0.0.1` and rejects non-local sockets.
- Allowed origins are restricted to `http(s)://localhost` and `http(s)://127.0.0.1`.
- All bridge routes require JSON POST and validated payloads.
- Extension commands that write files or start preview services require trusted workspace.

## Sensitive Surfaces

- Profile secrets (`password`, `sessionToken`, `proxyApiKey`) are only read by `FMClient`/`ProxyClient`.
- Generated `.env.local` includes bridge URL only, never secrets.
- Runtime session storage persists record context/found-set IDs only; it does not store credentials.
