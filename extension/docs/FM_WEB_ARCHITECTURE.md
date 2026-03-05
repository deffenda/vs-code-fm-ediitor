# FM Web Architecture

## Overview

The FM Web stack is split into four layers:

1. VS Code extension services
2. Layout Mode webview (designer)
3. Generated Next.js runtime (`.fmweb/generated/runtime-next`)
4. Shared renderer/schema package (`@fmweb/shared`)

## Core Flows

- Layout authoring: webview edits `LayoutDefinition` JSON in `.fmweb/layouts`.
- Metadata sync: extension pulls schema/scripts/fields into `.fmweb/metadata`.
- Runtime generation: extension copies template app and generated layout artifacts into `.fmweb/generated`.
- Live runtime data: Next.js app calls extension-managed localhost bridge (`/fm/*`) for CRUD/script operations.
- Runtime context tracking: Next.js runtime keeps found set/current record context in session state and carries record context when navigating between web layouts.

## Design Constraints

- Webviews never access FileMaker directly.
- Credentials never leave VS Code `SecretStorage`; only `FMClient` touches auth state.
- Generated runtime files are deterministic and skip existing user-customized files.
- Bridge only binds localhost and enforces origin checks + workspace trust.
