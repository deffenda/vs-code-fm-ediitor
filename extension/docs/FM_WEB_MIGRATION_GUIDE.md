# FM Web Migration Guide

## 1) Initialize

Run `FileMaker: Initialize FM Web Project` to create `.fmweb/` folders.

## 2) Select Profile + Sync

Run:

- `FileMaker: Select Active Profile`
- `FileMaker: Sync Metadata`

## 3) Design Layouts

Open `FileMaker: Open Layout Mode`, design, and save layouts in `.fmweb/layouts`.

## 4) Generate Runtime

Run:

- `FileMaker: Generate Next.js App`
- `FileMaker: Generate Layout Page`

Generated artifacts are written to `.fmweb/generated`.

## 5) Preview + CRUD

Run `FileMaker: Start Preview Server`:

- Starts localhost bridge
- Writes bridge URL to runtime `.env.local`
- Starts Next.js dev server

The runtime can then perform live CRUD and script execution through bridge routes.
