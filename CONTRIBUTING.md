# Contributing

## Development Setup

```bash
npm install
npm run lint
npm run build
npm test
```

Launch extension host:
1. Open repo in VS Code.
2. Press `F5`.

## Project Conventions

- TypeScript strict mode is required.
- Avoid `any`; keep explicit types on API responses and message contracts.
- Keep secrets out of settings/state/logs.
- Use shared utilities:
  - `utils/normalizeError.ts`
  - `utils/redact.ts`
  - `utils/errorUx.ts`
  - `services/settingsService.ts`

## Adding Commands or Views

1. Add command implementation under `src/commands/`.
2. Register in `src/extension.ts`.
3. Add command/menu contributions in `package.json`.
4. Enforce role/trust guard where needed.
5. Add unit/integration tests.

## Adding New FileMaker Endpoints Safely

1. Add endpoint typing in `src/types/dataApi.ts` and/or `src/types/fm.ts`.
2. Implement endpoint in `src/services/fmClient.ts` using existing request wrapper.
3. Propagate `AbortSignal` where feasible.
4. Normalize errors with `normalizeError()`.
5. Redact sensitive values in logs and error details.
6. Add mocked integration tests in `test/integration/`.

## Testing Guidance

- Unit tests: pure helpers/stores/services behavior.
- Integration tests: mocked HTTP contract behavior (`nock`) and client orchestration.

Run before submitting:

```bash
npm run lint
npm run build
npm test
```
