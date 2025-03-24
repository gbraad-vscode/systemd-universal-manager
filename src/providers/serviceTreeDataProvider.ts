import * as vscode from 'vscode';
import axios from 'axios';

export class ServiceTreeItem extends vscode.TreeItem {
    constructor(
        public readonly unit: any,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(unit.unit, collapsibleState);
        
        this.tooltip = `${unit.description}`;
        this.description = `${unit.active} (${unit.sub})`;
        
        // Set icon based on active state
        if (unit.active === 'active') {
            this.iconPath = new vscode.ThemeIcon('play');
        } else if (unit.active === 'inactive') {
            this.iconPath = new vscode.ThemeIcon('debug-stop');
        } else {
            this.iconPath = new vscode.ThemeIcon('warning');
        }

        // Set context value for command enablement
        this.contextValue = unit.active === 'active' ? 'activeService' : 'inactiveService';
    }
}

export class ServiceTreeDataProvider implements vscode.TreeDataProvider<ServiceTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ServiceTreeItem | undefined | null | void> = new vscode.EventEmitter<ServiceTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ServiceTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private apiUrl: string) {}

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
            const units = await this.listUnits();
            console.log("Received units: ", units); // Add logging here
            const serviceUnits = units.filter(unit => unit.unit.endsWith('.service'));
            
            return serviceUnits.map(unit => 
                new ServiceTreeItem(unit, vscode.TreeItemCollapsibleState.None)
            );
        }
    }

    async listUnits(): Promise<any[]> {
        const response = await axios.get(`${this.apiUrl}/list-units`);
        return response.data;
    }
}