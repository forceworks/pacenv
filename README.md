# PAC Environment per Project

A VS Code extension that automatically switches Power Platform CLI (`pac`) profiles when you switch between projects. Each project maintains its own pinned PAC environment profile.

## Why?

The `pac` CLI remembers the last selected auth profile globally. When jumping between different projects/repos, it's easy to accidentally run commands against the wrong environment. This extension fixes that by:
- **Automatically applying** the correct profile when you open a project
- **Maintaining** each project's profile setting independently
- **Switching profiles** automatically as you switch between project windows

## Features

- 🔄 **Auto-switch on project open** - Automatically applies the pinned profile when opening a project
- 📌 **Per-project profiles** - Each project maintains its own profile in workspace settings
- 📊 **Status bar indicator** - Shows current active profile with checkmark (✓) if it matches the pinned one
- 🎯 **Smart profile matching** - Finds profiles by name even after re-authentication (when indices change)
- 📝 **`.pacenv` file support** - Alternative to workspace settings for profile configuration

## Installation

### From VSIX
```bash
code --install-extension Forceworks.pac-environment-1.0.0.vsix
```

### From Source
```bash
git clone https://github.com/forceworks/pacenv.git
cd pacenv
npm install
npm run compile
```

## Usage

1. **Pin a profile to your project:**
   - Click the PAC status in the bottom-right status bar
   - Select the profile you want for this project
   - Choose "Apply Now" or "Apply Later"

2. **Auto-switching:**
   - When you open this project later, it will automatically apply the pinned profile
   - When you switch between project windows, each project's profile is applied automatically

3. **Manual commands:**
   - `PAC Env: Select & Pin Profile (Workspace)` - Choose and pin a profile
   - `PAC Env: Apply Pinned Profile Now` - Manually apply the pinned profile
   - `PAC Env: Refresh Status` - Refresh the status bar display

## Configuration

### Settings (in `.vscode/settings.json`)
- `pacEnv.profileName` - The pinned profile name for this workspace
- `pacEnv.autoApplyOnOpen` - Auto-apply on workspace open (default: `true`)
- `pacEnv.readFromDotfile` - Read from `.pacenv` file if settings empty (default: `true`)

### `.pacenv` File (Alternative)
Create a `.pacenv` file in your project root containing just the profile name:
```
DEV - MyEnvironment
```

## How It Works

1. **Profile Storage:** The extension stores the environment NAME (e.g., "DEV - Solgari RS"), not the index
2. **Index Lookup:** When applying a profile, it runs `pac auth list` to find the current index for that name
3. **Resilient to Re-auth:** Even if you clear auth and re-authenticate (changing all indices), the extension will still find the correct profile by name
4. **Smart Matching:** Uses exact match first, then case-insensitive, then partial matching as fallback

## Requirements

- [Power Platform CLI](https://aka.ms/PowerPlatformCLI) must be installed and on PATH
- At least one authenticated profile (`pac auth create`)

## Repository

Source code: https://github.com/forceworks/pacenv

## License

MIT

## Author

Forceworks