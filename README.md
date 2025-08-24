# PAC Environment per Project

This extension shows your active `pac` profile in the VS Code status bar and lets you pin a profile per project. On open, it can auto-apply `pac auth select` for the pinned profile.

## Why?
The `pac` CLI remembers the last selected auth profile globally. If you jump between repos, it's easy to run commands in the wrong environment. This fixes that by pinning the intended profile at the workspace level.

## Features
- Status bar item: `PAC: <active-profile>` (click to select/pin)
- Command: **PAC Env: Select & Pin Profile (Workspace)** – choose from `pac auth list` and save to workspace setting `pacEnv.profileName` (and .pacenv file optional)
- Command: **PAC Env: Apply Pinned Profile Now** – runs `pac auth select --name <profile>`
- Command: **PAC Env: Refresh Status** – re-reads current active profile
- Optional `.pacenv` file in workspace root (single line with profile name)

## Settings
- `pacEnv.profileName` (string): pinned profile name for this workspace
- `pacEnv.autoApplyOnOpen` (boolean, default true): auto-run `pac auth select` on open
- `pacEnv.readFromDotfile` (boolean, default true): read `.pacenv` if setting empty

## Requirements
- Power Platform CLI (`pac`) must be installed and on PATH

## Quick Start
1. Install deps and build
```bash
npm i
npm run compile
```
2. Press `F5` to launch the Extension Development Host.
3. Run command **PAC Env: Select & Pin Profile (Workspace)**, pick your profile.
4. The status bar should show the active profile. On next open, it will auto-apply.

## Optional: .pacenv file
Create a `.pacenv` at the repo root containing just the profile name, e.g.
```
myDevEnv
```
The extension will use this if the workspace setting is empty.

## Notes
- If `pac` supports `--json` for `auth list`, JSON parsing will be used; otherwise the extension falls back to text parsing (lines with a leading `*` indicate the active profile).
- If `pac` is missing, you'll get a warning and a command to open install docs.