import * as vscode from 'vscode';
import { SystemdService, ServiceMode } from './services/systemdService';
import { ServiceTreeDataProvider, ServiceGroupType } from './providers/serviceTreeDataProvider';

export function activate(context: vscode.ExtensionContext) {
    // Get the stored mode or default to system
    const storedMode = context.globalState.get<ServiceMode>('serviceMode') || ServiceMode.System;
    
    const systemdService = new SystemdService();
    // Set the initial mode from stored settings
    systemdService.currentMode = storedMode;
    
    const serviceTreeDataProvider = new ServiceTreeDataProvider(systemdService);
    
    vscode.window.registerTreeDataProvider('systemdServiceExplorer', serviceTreeDataProvider);
    
    context.subscriptions.push(
        vscode.commands.registerCommand('systemd-manager.refreshServices', () => {
            serviceTreeDataProvider.refresh();
        }),
        
        vscode.commands.registerCommand('systemd-manager.startService', async (item) => {
            if (item) {
                await systemdService.startUnit(item.unit.name);
                serviceTreeDataProvider.refresh();
            }
        }),
        
        vscode.commands.registerCommand('systemd-manager.stopService', async (item) => {
            if (item) {
                await systemdService.stopUnit(item.unit.name);
                serviceTreeDataProvider.refresh();
            }
        }),
        
        vscode.commands.registerCommand('systemd-manager.restartService', async (item) => {
            if (item) {
                await systemdService.restartUnit(item.unit.name);
                serviceTreeDataProvider.refresh();
            }
        }),
        
        vscode.commands.registerCommand('systemd-manager.viewServiceStatus', async (item) => {
            if (item) {
                const status = await systemdService.getUnitStatus(item.unit.name);
                
                // TODO: do not open a new one
                const channel = vscode.window.createOutputChannel(`Systemd: ${item.unit.name}`);
                channel.appendLine(status);
                channel.show();
            }
        }),
        
        vscode.commands.registerCommand('systemd-manager.toggleServiceMode', () => {
            serviceTreeDataProvider.toggleServiceMode();
            
            context.globalState.update('serviceMode', systemdService.currentMode);
        }),
        
        vscode.commands.registerCommand('systemd-manager.groupByStatus', () => {
            serviceTreeDataProvider.setGroupType(ServiceGroupType.ByStatus);
        }),
        
        vscode.commands.registerCommand('systemd-manager.showAllServices', () => {
            serviceTreeDataProvider.setGroupType(ServiceGroupType.All);
        }),
        
        vscode.commands.registerCommand('systemd-manager.filterServices', async () => {
            const filterText = await vscode.window.showInputBox({
                placeHolder: 'Filter services by name or description',
                prompt: 'Enter text to filter services'
            });
            
            if (filterText !== undefined) {
                serviceTreeDataProvider.setFilterText(filterText);
            }
        }),
        
        vscode.commands.registerCommand('systemd-manager.clearFilter', () => {
            serviceTreeDataProvider.setFilterText('');
        }),

        vscode.commands.registerCommand('systemd-manager.enableService', async (item) => {
            if (item) {
                await systemdService.enableUnit(item.unit.name);
                serviceTreeDataProvider.refresh();
            }
        }),
        
        vscode.commands.registerCommand('systemd-manager.disableService', async (item) => {
            if (item) {
                await systemdService.disableUnit(item.unit.name);
                serviceTreeDataProvider.refresh();
            }
        }),
        
        vscode.commands.registerCommand('systemd-manager.maskService', async (item) => {
            if (item) {
                const response = await vscode.window.showWarningMessage(
                    `Are you sure you want to mask ${item.unit.name}? This will make it impossible to start the service until it is unmasked.`,
                    'Yes', 'No'
                );
                if (response === 'Yes') {
                    await systemdService.maskUnit(item.unit.name);
                    serviceTreeDataProvider.refresh();
                }
            }
        }),
        
        vscode.commands.registerCommand('systemd-manager.unmaskService', async (item) => {
            if (item) {
                await systemdService.unmaskUnit(item.unit.name);
                serviceTreeDataProvider.refresh();
            }
        })
    );
}

export function deactivate() {}