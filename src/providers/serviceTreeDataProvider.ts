import * as vscode from 'vscode';
import { SystemdService, SystemdUnit, ServiceMode } from '../services/systemdService';

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

// New class to represent the mode selection item at the top of the tree
export class ServiceModeItem extends vscode.TreeItem {
    constructor(
        public readonly currentMode: ServiceMode
    ) {
        super('', vscode.TreeItemCollapsibleState.None);
        
        this.label = `Mode: ${currentMode === ServiceMode.System ? 'System' : 'User'}`;
        this.contextValue = 'serviceMode';
        this.tooltip = `Click to switch to ${currentMode === ServiceMode.System ? 'User' : 'System'} services`;
        this.description = 'Switch to view different services';
        
        // Icon for the mode
        this.iconPath = new vscode.ThemeIcon(
            currentMode === ServiceMode.System ? 'server' : 'person'
        );
        
        // Make the item look like a button
        this.command = {
            command: 'systemd-manager.toggleServiceMode',
            title: 'Toggle Service Mode',
            arguments: [this]
        };
    }
}

export class ServiceTreeDataProvider implements vscode.TreeDataProvider<ServiceTreeItem | ServiceGroupItem | ServiceModeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<ServiceTreeItem | ServiceGroupItem | ServiceModeItem | undefined | null | void>();
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

    toggleServiceMode(): void {
        const newMode = this.systemdService.currentMode === ServiceMode.System 
            ? ServiceMode.User 
            : ServiceMode.System;
            
        this.systemdService.currentMode = newMode;
        this.refresh();
    }

    getTreeItem(element: ServiceTreeItem | ServiceGroupItem | ServiceModeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: ServiceTreeItem | ServiceGroupItem | ServiceModeItem): Promise<Array<ServiceTreeItem | ServiceGroupItem | ServiceModeItem>> {
        if (element) {
            if (element instanceof ServiceGroupItem) {
                return element.units
                    .filter(unit => this.matchesFilter(unit))
                    .map(unit => new ServiceTreeItem(unit, vscode.TreeItemCollapsibleState.None));
            }
            return []; 
        } 
        else {
            // Add the mode selector at the top
            const modeSelector = new ServiceModeItem(this.systemdService.currentMode);
            
            this.units = await this.systemdService.listUnits();
            const serviceUnits = this.units.filter(unit => unit.type === 'service');
            
            const filteredUnits = this.filterText ? 
                serviceUnits.filter(unit => this.matchesFilter(unit)) : 
                serviceUnits;
            
            switch (this.groupType) {
                case ServiceGroupType.ByStatus:
                    return [modeSelector, ...this.groupByStatus(filteredUnits)];
                    
                case ServiceGroupType.All:
                default:
                    if (this.filterText) {
                        return [
                            modeSelector,
                            ...filteredUnits.map(unit => new ServiceTreeItem(unit, vscode.TreeItemCollapsibleState.None))
                        ];
                    }
                    return [
                        modeSelector,
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