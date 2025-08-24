# How to Run the PAC Environment Extension

## Method 1: Using VS Code Debug (Recommended)
1. Open this project folder in VS Code
2. Press **F5** on your keyboard
3. A new VS Code window will open (Extension Development Host)
4. In the new window, you should see "PAC: DEV - Solgari RS" in the status bar (bottom right)

## Method 2: Using Command Palette
1. In the Extension Development Host window
2. Press **Ctrl+Shift+P** to open command palette
3. Type "PAC Env" to see available commands:
   - PAC Env: Select & Pin Profile (Workspace)
   - PAC Env: Apply Pinned Profile Now
   - PAC Env: Refresh Status

## Testing the Extension
1. Click on the status bar item "PAC: DEV - Solgari RS"
2. You'll see a list of your PAC profiles
3. Select one to pin it to the workspace

## Troubleshooting
If you don't see the status bar item:
- Make sure you're in the Extension Development Host window (not the original)
- Check the Output panel (View > Output) and select "Extension Host" from dropdown
- Try running command "PAC Env: Refresh Status" from command palette