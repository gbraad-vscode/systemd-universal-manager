import * as vscode from 'vscode';
import { SystemdService, SystemdUnit } from '../services/systemdService';

export class ServiceTreeItem extends vscode.TreeItem {
    constructor(
        public readonly unit: SystemdUnit,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(unit.name, collapsibleState);
        
        this.tooltip = `${unit.description}`;
        this.description = `${unit.activeState} (${unit.subState})`;
        
        // Set icon based on active state
        if (unit.activeState === 'active') {
            this.iconPath = new vscode.ThemeIcon('play');
        } else if (unit.activeState === 'inactive') {
            this.iconPath = new vscode.ThemeIcon('debug-stop');
        } else {
            this.iconPath = new vscode.ThemeIcon('warning');
        }

        // Set context value for command enablement
        this.contextValue = unit.activeState === 'active' ? 'activeService' : 'inactiveService';
    }
}

export class ServiceTreeDataProvider implements vscode.TreeDataProvider<ServiceTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ServiceTreeItem | undefined | null | void> = new vscode.EventEmitter<ServiceTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ServiceTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private systemdService: SystemdService) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ServiceTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: ServiceTreeItem): Promise<ServiceTreeItem[]> {
        if (element) {
            return [];
        } else {
            const units = await this.systemdService.listUnits();
            const serviceUnits = units.filter(unit => unit.type === 'service');
            
            return serviceUnits.map(unit => 
                new ServiceTreeItem(unit, vscode.TreeItemCollapsibleState.None)
            );
        }
    }
}