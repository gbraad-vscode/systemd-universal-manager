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
            vscode.window.showErrorMessage(`Failed to get status for ${unitName}: ${error}`);
            return '';
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