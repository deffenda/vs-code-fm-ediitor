# FM Web Layout Schema

`LayoutDefinition` is versioned and validated via Zod.

## Top-Level Shape

- `schemaVersion`
- `id`
- `name`
- `fmLayoutName`
- `canvas { width, height, gridSize }`
- `objects[]`
- `styles`

## Object Types

- `field`
- `text`
- `button`
- `portal`
- `rectangle`
- `image`
- `tabPanel`

## Behavior Binding

Every object can carry optional `behavior`:

- `runScript`
- `goToWebLayout`
- `goToFmLayout`
- `openUrl`
- `showDialog`

Additional fields include `scriptName`, `targetLayoutId`, `targetFmLayoutName`, `url`, `dialogId`, `parameter`.

## Migration

- `migrateLayoutDefinition` auto-migrates older schema versions to current.
- Unknown future schema versions are rejected to avoid unsafe down-level parsing.
