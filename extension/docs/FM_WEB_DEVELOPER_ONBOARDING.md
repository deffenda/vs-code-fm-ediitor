# FM Web Developer Onboarding

## Prerequisites

- Node + npm
- VS Code extension development environment
- FileMaker profile configured in extension

## Local Workflow

1. `npm install` (repo root)
2. `npm run build`
3. Launch extension host and run FM Web commands from Command Palette

## Key Commands

- `FileMaker: Initialize FM Web Project`
- `FileMaker: Sync Metadata`
- `FileMaker: Open Layout Mode`
- `FileMaker: Generate Next.js App`
- `FileMaker: Generate Layout Page`
- `FileMaker: Start Preview Server`

## Test Commands

- `npm run typecheck`
- `npm test`
- `npm run lint`

## Important Paths

- `.fmweb/layouts`: authored layout definitions
- `.fmweb/metadata`: synced FileMaker metadata cache
- `.fmweb/generated/runtime-next`: generated runtime app
- `.fmweb/generated/layouts`: generated runtime layout artifacts
