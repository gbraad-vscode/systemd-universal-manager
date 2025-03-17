import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface SystemdUnit {
    name: string;
    description: string;
    loadState: string;
    activeState: string;
    subState: string;
    type: string;
}

export class SystemdService {
    
    async listUnits(): Promise<SystemdUnit[]> {
        try {
            const { stdout } = await execAsync('systemctl list-units --type=service --all --output=json');
            return this.parseUnits(stdout);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to list systemd units: ${error}`);
            return [];
        }
    }

    async startUnit(unitName: string): Promise<boolean> {
        try {
            await execAsync(`systemctl start ${unitName}`);
            vscode.window.showInformationMessage(`Started ${unitName}`);
            return true;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to start ${unitName}: ${error}`);
            return false;
        }
    }

    async stopUnit(unitName: string): Promise<boolean> {
        try {
            await execAsync(`systemctl stop ${unitName}`);
            vscode.window.showInformationMessage(`Stopped ${unitName}`);
            return true;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to stop ${unitName}: ${error}`);
            return false;
        }
    }

    async restartUnit(unitName: string): Promise<boolean> {
        try {
            await execAsync(`systemctl restart ${unitName}`);
            vscode.window.showInformationMessage(`Restarted ${unitName}`);
            return true;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to restart ${unitName}: ${error}`);
            return false;
        }
    }

    async getUnitStatus(unitName: string): Promise<string> {
        try {
            const { stdout } = await execAsync(`systemctl status ${unitName}`);
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