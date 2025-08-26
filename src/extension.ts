import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

// Helper functions
function cfg() {
    return vscode.workspace.getConfiguration('pacEnv');
}

async function getProfiles(): Promise<{ profiles: Array<{ Name?: string; IsActive?: boolean; Index?: number }> }> {
    try {
        // Get PAC auth list output (JSON format not supported)
        const { stdout } = await execAsync('pac auth list');
        const lines = stdout.split('\n');
        const profiles: Array<{ Name?: string; IsActive?: boolean; Index?: number }> = [];
        
        for (const line of lines) {
            const trimmed = line.trim();
            // Skip header and separator lines
            if (!trimmed || trimmed.startsWith('Index') || trimmed.startsWith('---')) {
                continue;
            }
            
            // Check if line starts with [number]
            const indexMatch = trimmed.match(/^\[(\d+)\]/);
            if (indexMatch) {
                const index = parseInt(indexMatch[1], 10);
                const isActive = trimmed.includes('*');
                
                // Split by "User" to get the part after it
                const userSplit = trimmed.split('User');
                if (userSplit.length >= 2) {
                    const afterUser = userSplit[1].trim();
                    // Split by URL pattern (starts with http)
                    const urlMatch = afterUser.match(/^(.*?)\s+(https?:\/\/.*)$/);
                    if (urlMatch) {
                        const envName = urlMatch[1].trim();
                        profiles.push({ Name: envName, IsActive: isActive, Index: index });
                    }
                }
            }
        }
        return { profiles };
    } catch (error) {
        console.error('Failed to get PAC profiles:', error);
        return { profiles: [] };
    }
}

async function applyProfile(name: string): Promise<boolean> {
    try {
        // First get the profiles to find the index for this name
        const { profiles } = await getProfiles();
        
        // Try exact match first
        let profile = profiles.find(p => p.Name === name);
        
        // If no exact match, try case-insensitive match
        if (!profile) {
            profile = profiles.find(p => p.Name?.toLowerCase() === name.toLowerCase());
        }
        
        // If still no match, try partial match (contains)
        if (!profile) {
            profile = profiles.find(p => p.Name?.toLowerCase().includes(name.toLowerCase()));
        }
        
        if (!profile?.Index) {
            console.error(`Profile "${name}" not found in list`);
            const availableProfiles = profiles.map(p => p.Name).join(', ');
            vscode.window.showErrorMessage(`Profile "${name}" not found. Available: ${availableProfiles}`);
            return false;
        }
        
        // Log the match for debugging
        if (profile.Name !== name) {
            console.log(`Profile name normalized: "${name}" matched to "${profile.Name}"`);
        }
        
        // Use the current index to select the profile (indices may change after re-auth)
        const command = `pac auth select --index ${profile.Index}`;
        console.log(`Running command: ${command} (for profile: ${profile.Name})`);
        
        const { stdout, stderr } = await execAsync(command);
        
        if (stderr && !stderr.includes('Success')) {
            console.error(`Command stderr: ${stderr}`);
        }
        if (stdout) {
            console.log(`Command stdout: ${stdout}`);
        }
        
        // Only show success as a subtle status bar message, not a notification
        return true;
    } catch (error: any) {
        const errorMsg = `Failed to apply profile ${name}: ${error.message || error}`;
        console.error(errorMsg);
        vscode.window.showErrorMessage(errorMsg);
        return false;
    }
}

function readPacenvFromDotfile(ws?: vscode.WorkspaceFolder): string | undefined {
    if (!ws) return undefined;
    try {
        const pacenvPath = path.join(ws.uri.fsPath, '.pacenv');
        if (fs.existsSync(pacenvPath)) {
            const content = fs.readFileSync(pacenvPath, 'utf-8');
            return content.trim();
        }
    } catch (error) {
        console.error('Failed to read .pacenv file:', error);
    }
    return undefined;
}

// Status bar
let status: vscode.StatusBarItem;

async function updateStatus(loading = false): Promise<void> {
    if (!status) {
        status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        status.command = 'pacEnv.selectProfile';
    }
    
    if (loading) {
        status.text = '$(sync~spin) PAC: Loading...';
        status.show();
        return;
    }
    
    const { profiles } = await getProfiles();
    const active = profiles.find(p => p.IsActive);
    const pinned = cfg().get<string>('profileName');
    
    if (active?.Name) {
        const match = pinned && active.Name === pinned ? '✓' : '';
        status.text = `$(server) PAC: ${active.Name} ${match}`;
        status.tooltip = pinned ? `Pinned: ${pinned}` : 'Click to pin a profile';
    } else {
        status.text = '$(server) PAC: None';
        status.tooltip = 'No active PAC profile';
    }
    status.show();
}

// Main activation
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    // Ensure profile is applied on open
    async function ensureAppliedOnOpen(): Promise<void> {
        const auto = cfg().get<boolean>('autoApplyOnOpen') ?? true;  // Default to true
        const profileSetting = cfg().get<string>('profileName');
        const useDot = cfg().get<boolean>('readFromDotfile') ?? true;
        
        let name = profileSetting?.trim();
        if (!name && useDot) {
            const ws = vscode.workspace.workspaceFolders?.[0];
            name = readPacenvFromDotfile(ws);
        }
        
        if (!name) {
            console.log('No pinned profile for this workspace');
            return;
        }
        
        console.log(`Found pinned profile for workspace: ${name}`);
        
        if (auto) {
            console.log(`Auto-applying profile: ${name}`);
            const success = await applyProfile(name);
            if (success) {
                console.log(`Successfully applied profile: ${name}`);
                // Show subtle message in status bar
                vscode.window.setStatusBarMessage(`✓ Applied profile: ${name}`, 3000);
            } else {
                console.error(`Failed to auto-apply profile: ${name}`);
            }
        }
        await updateStatus();
    }
    
    const selectProfile = vscode.commands.registerCommand('pacEnv.selectProfile', async () => {
        try {
            await updateStatus(true);
            const { profiles } = await getProfiles();
            if (!profiles.length) {
                const choice = await vscode.window.showWarningMessage(
                    'No pac profiles found. Is the Power Platform CLI (pac) installed and logged in? ',
                    'Install Docs'
                );
                if (choice === 'Install Docs') {
                    vscode.env.openExternal(vscode.Uri.parse('https://aka.ms/pac/cli')); // official shortlink
                }
                return;
            }
            
            const items = profiles.map(p => ({
                label: p.Name ?? '(unnamed)',
                description: p.IsActive ? '$(check) Active' : '',
                detail: p.IsActive ? 'Currently active profile' : undefined
            }));
            const pick = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a pac profile to pin for this workspace',
                title: 'PAC Environment'
            });
            if (!pick?.label) return;
            
            try {
                // Make sure we have a workspace to save to
                if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
                    vscode.window.showErrorMessage('No workspace folder open. Please open a folder to save profile settings.');
                    return;
                }
                
                // Store the environment name (not index, as indices can change)
                await vscode.workspace.getConfiguration('pacEnv').update('profileName', pick.label, vscode.ConfigurationTarget.Workspace);
                
                const applyNow = await vscode.window.showQuickPick(
                    ['Apply Now', 'Apply Later'],
                    {
                        placeHolder: `Profile '${pick.label}' pinned. Apply now?`,
                        title: 'PAC Environment'
                    }
                );
                
                if (applyNow === 'Apply Now') {
                    await updateStatus(true);
                    const ok = await applyProfile(pick.label);
                    if (!ok) {
                        vscode.window.showErrorMessage(`Failed to apply profile '${pick.label}'.`);
                    }
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to pin profile: ${error}`);
                console.error('Failed to pin profile:', error);
            }
            await updateStatus();
        } catch (error) {
            vscode.window.showErrorMessage(`Error in selectProfile command: ${error}`);
            console.error('Error in selectProfile command:', error);
        }
    });
    
    const applyPinned = vscode.commands.registerCommand('pacEnv.applyProfile', async () => {
        const name = cfg().get<string>('profileName');
        if (!name) {
            vscode.window.showWarningMessage('No pinned pac profile in settings. Run "PAC Env: Select & Pin Profile (Workspace)".');
            return;
        }
        await updateStatus(true);
        const ok = await applyProfile(name);
        if (!ok) vscode.window.showErrorMessage(`Failed to apply pac profile '${name}'.`);
        await updateStatus();
    });
    
    const refresh = vscode.commands.registerCommand('pacEnv.refreshStatus', async () => {
        await updateStatus(true);
    });
    
    // Watch .pacenv changes
    const ws = vscode.workspace.workspaceFolders?.[0];
    if (ws) {
        const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(ws, '.pacenv'));
        watcher.onDidCreate(() => ensureAppliedOnOpen());
        watcher.onDidChange(() => ensureAppliedOnOpen());
        watcher.onDidDelete(() => updateStatus());
        context.subscriptions.push(watcher);
    }
    
    context.subscriptions.push(selectProfile, applyPinned, refresh, status);
    
    // Listen for workspace folder changes (switching between projects)
    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(async () => {
            console.log('Workspace folders changed, re-applying profile...');
            await ensureAppliedOnOpen();
            await updateStatus();
        })
    );
    
    // Listen for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration('pacEnv.profileName')) {
                console.log('Profile configuration changed, re-applying profile...');
                await ensureAppliedOnOpen();
                await updateStatus();
            }
        })
    );
    
    // On open - ensure we apply the pinned profile for this workspace
    console.log('PAC Environment extension activated');
    await ensureAppliedOnOpen();
    await updateStatus();
}

export function deactivate(): void {
    // nothing
}