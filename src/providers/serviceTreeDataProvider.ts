import * as vscode from 'vscode';
import { SystemdService, SystemdUnit } from '../services/systemdService';

// Define group types
export enum ServiceGroupType {
    All = 'all',
    ByStatus = 'status',
    ByType = 'type'  // For future categorization
}

// Represent a group in the tree view
export class ServiceGroupItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly groupId: string,
        public readonly units: SystemdUnit[]
    ) {
        super(label, vscode.TreeItemCollapsibleState.Expanded);
        this.contextValue = 'serviceGroup';
        this.tooltip = `${units.length} services`;
        this.description = `${units.length} services`;
        
        // Icon for the group
        this.iconPath = new vscode.ThemeIcon('folder');
    }
}

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

export class ServiceTreeDataProvider implements vscode.TreeDataProvider<ServiceTreeItem | ServiceGroupItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<ServiceTreeItem | ServiceGroupItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
    
    private groupType = ServiceGroupType.All;
    private filterText = '';
    private units: SystemdUnit[] = [];

    constructor(private systemdService: SystemdService) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    setGroupType(groupType: ServiceGroupType): void {
        this.groupType = groupType;
        this.refresh();
    }

    setFilterText(filterText: string): void {
        this.filterText = filterText.toLowerCase();
        this.refresh();
    }

    getTreeItem(element: ServiceTreeItem | ServiceGroupItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: ServiceTreeItem | ServiceGroupItem): Promise<Array<ServiceTreeItem | ServiceGroupItem>> {
        if (element) {
            if (element instanceof ServiceGroupItem) {
                return element.units
                    .filter(unit => this.matchesFilter(unit))
                    .map(unit => new ServiceTreeItem(unit, vscode.TreeItemCollapsibleState.None));
            }
            return []; 
        } 
        else {
            this.units = await this.systemdService.listUnits();
            const serviceUnits = this.units.filter(unit => unit.type === 'service');
            
            const filteredUnits = this.filterText ? 
                serviceUnits.filter(unit => this.matchesFilter(unit)) : 
                serviceUnits;

            switch (this.groupType) {
                case ServiceGroupType.ByStatus:
                    return this.groupByStatus(filteredUnits);
                    
                case ServiceGroupType.All:
                default:
                    if (this.filterText) {
                        return filteredUnits.map(unit => 
                            new ServiceTreeItem(unit, vscode.TreeItemCollapsibleState.None)
                        );
                    }
                    return [
                        new ServiceGroupItem('All Services', 'all', filteredUnits)
                    ];
            }
        }
    }

    private matchesFilter(unit: SystemdUnit): boolean {
        if (!this.filterText) {
            return true;
        }
        
        return unit.name.toLowerCase().includes(this.filterText) || 
               unit.description.toLowerCase().includes(this.filterText);
    }

    private groupByStatus(units: SystemdUnit[]): ServiceGroupItem[] {
        const activeUnits = units.filter(unit => unit.activeState === 'active');
        const inactiveUnits = units.filter(unit => unit.activeState === 'inactive');
        const otherUnits = units.filter(unit => 
            unit.activeState !== 'active' && unit.activeState !== 'inactive');
        
        const groups: ServiceGroupItem[] = [];
        
        if (activeUnits.length > 0) {
            groups.push(new ServiceGroupItem('Active', 'active', activeUnits));
        }
        
        if (inactiveUnits.length > 0) {
            groups.push(new ServiceGroupItem('Inactive', 'inactive', inactiveUnits));
        }
        
        if (otherUnits.length > 0) {
            groups.push(new ServiceGroupItem('Other', 'other', otherUnits));
        }
        
        return groups;
    }
}