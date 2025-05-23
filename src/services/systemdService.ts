import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export enum ServiceMode {
    System = 'system',
    User = 'user'
}

export interface SystemdUnit {
    name: string;
    description: string;
    loadState: string;
    activeState: string;
    subState: string;
    type: string;
}

export class SystemdService {
    private _currentMode: ServiceMode = ServiceMode.System;
    
    get currentMode(): ServiceMode {
        return this._currentMode;
    }
    
    set currentMode(mode: ServiceMode) {
        this._currentMode = mode;
    }
    
    async listUnits(): Promise<SystemdUnit[]> {
        try {
            const command = this._currentMode === ServiceMode.System 
                ? 'systemctl list-units --type=service --all --output=json' 
                : 'systemctl --user list-units --type=service --all --output=json';
                
            const { stdout } = await execAsync(command);
            return this.parseUnits(stdout);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to list systemd units: ${error}`);
            return [];
        }
    }

    async startUnit(unitName: string): Promise<boolean> {
        try {
            const command = this._currentMode === ServiceMode.System 
                ? `sudo systemctl start ${unitName}`
                : `systemctl --user start ${unitName}`;
                
            await execAsync(command);
            vscode.window.showInformationMessage(`Started ${unitName}`);
            return true;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to start ${unitName}: ${error}`);
            return false;
        }
    }

    async stopUnit(unitName: string): Promise<boolean> {
        try {
            const command = this._currentMode === ServiceMode.System 
                ? `sudo systemctl stop ${unitName}`
                : `systemctl --user stop ${unitName}`;
                
            await execAsync(command);
            vscode.window.showInformationMessage(`Stopped ${unitName}`);
            return true;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to stop ${unitName}: ${error}`);
            return false;
        }
    }

    async restartUnit(unitName: string): Promise<boolean> {
        try {
            const command = this._currentMode === ServiceMode.System 
                ? `sudo systemctl restart ${unitName}`
                : `systemctl --user restart ${unitName}`;
                
            await execAsync(command);
            vscode.window.showInformationMessage(`Restarted ${unitName}`);
            return true;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to restart ${unitName}: ${error}`);
            return false;
        }
    }

    async getUnitStatus(unitName: string): Promise<string> {
        try {
            const command = this._currentMode === ServiceMode.System 
                ? `systemctl status ${unitName}`
                : `systemctl --user status ${unitName}`;
                
            const { stdout } = await execAsync(command);
            return stdout;
        } catch (error) {
            // For systemctl status, exit code 3 is normal for inactive services
            // and should still return the output
            if (error instanceof Error && 'stdout' in error) {
                const execError = error as any;
                if (execError.code === 3 && execError.stdout) {
                    return execError.stdout;
                }
            }
            
            // Otherwise
            vscode.window.showErrorMessage(`Failed to get status for ${unitName}: ${error}`);
            return '';
        }
    }

    async enableUnit(unitName: string): Promise<boolean> {
        try {
            const command = this._currentMode === ServiceMode.System 
                ? `sudo systemctl enable ${unitName}`
                : `systemctl --user enable ${unitName}`;
                
            const { stdout } = await execAsync(command);
            vscode.window.showInformationMessage(`Enabled ${unitName}`);
            return true;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to enable ${unitName}: ${error}`);
            return false;
        }
    }
    
    async disableUnit(unitName: string): Promise<boolean> {
        try {
            const command = this._currentMode === ServiceMode.System 
                ? `sudo systemctl disable ${unitName}`
                : `systemctl --user disable ${unitName}`;
                
            const { stdout } = await execAsync(command);
            vscode.window.showInformationMessage(`Disabled ${unitName}`);
            return true;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to disable ${unitName}: ${error}`);
            return false;
        }
    }
    
    async maskUnit(unitName: string): Promise<boolean> {
        try {
            const command = this._currentMode === ServiceMode.System 
                ? `sudo systemctl mask ${unitName}`
                : `systemctl --user mask ${unitName}`;
                
            const { stdout } = await execAsync(command);
            vscode.window.showInformationMessage(`Masked ${unitName}`);
            return true;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to mask ${unitName}: ${error}`);
            return false;
        }
    }
    
    async unmaskUnit(unitName: string): Promise<boolean> {
        try {
            const command = this._currentMode === ServiceMode.System 
                ? `sudo systemctl unmask ${unitName}`
                : `systemctl --user unmask ${unitName}`;
                
            const { stdout } = await execAsync(command);
            vscode.window.showInformationMessage(`Unmasked ${unitName}`);
            return true;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to unmask ${unitName}: ${error}`);
            return false;
        }
    }

    private parseUnits(stdout: string): SystemdUnit[] {
        try {
            const units = JSON.parse(stdout);
            return units.map((unit: any) => {
                return {
                    name: unit.unit,
                    description: unit.description,
                    loadState: unit.load,
                    activeState: unit.active,
                    subState: unit.sub,
                    type: unit.unit.endsWith('.service') ? 'service' : 'other'
                };
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to parse systemd units: ${error}`);
            return [];
        }
    }
}