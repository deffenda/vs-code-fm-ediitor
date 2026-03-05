# FMWeb IDE Monorepo

This repository uses npm workspaces and contains:

- `extension`: VS Code extension (FileMaker Data API Tools)
- `shared`: shared schema/types/ui renderer utilities
- `designer-ui`: React webview app for Layout Mode
- `runtime-next`: Next.js runtime template for generated apps

## Commands

- `npm run build` - build all workspace packages
- `npm run dev` - run workspace dev commands in parallel
- `npm run test` - run tests in workspaces that define tests
- `npm run typecheck` - type-check all workspaces

## Extension packaging

Run `npm run package:check` from the repository root.
