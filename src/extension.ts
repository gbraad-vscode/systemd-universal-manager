import * as vscode from 'vscode';
import axios from 'axios';
import { exec } from 'child_process';
import { ServiceTreeDataProvider, ServiceTreeItem } from './providers/serviceTreeDataProvider';
import { startServer } from './server';

export function activate(context: vscode.ExtensionContext) {
    // Start the server/relay process
    startServer();

    const systemdServiceUrl = 'http://localhost:3000';
    const outputChannel = vscode.window.createOutputChannel('Systemd Service Status');

    const serviceTreeDataProvider = new ServiceTreeDataProvider(systemdServiceUrl);
    vscode.window.registerTreeDataProvider('systemdServiceExplorer', serviceTreeDataProvider);

    // Command to focus on the Systemd view
    context.subscriptions.push(
        vscode.commands.registerCommand('systemd-manager.focusSystemdView', async () => {
            await vscode.commands.executeCommand('workbench.view.extension.systemdServiceExplorer');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('systemd-manager.startService', async (serviceItem: ServiceTreeItem) => {
            vscode.window.showInformationMessage(`Starting service: ${serviceItem.unit.unit}`);
            try {
                const response = await axios.post(`${systemdServiceUrl}/start`, { serviceName: serviceItem.unit.unit });
                vscode.window.showInformationMessage(response.data);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to start service: ${(error as Error).message}`);
            }
            serviceTreeDataProvider.refresh();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('systemd-manager.stopService', async (serviceItem: ServiceTreeItem) => {
            vscode.window.showInformationMessage(`Stopping service: ${serviceItem.unit.unit}`);
            try {
                const response = await axios.post(`${systemdServiceUrl}/stop`, { serviceName: serviceItem.unit.unit });
                vscode.window.showInformationMessage(response.data);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to stop service: ${(error as Error).message}`);
            }
            serviceTreeDataProvider.refresh();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('systemd-manager.restartService', async (serviceItem: ServiceTreeItem) => {
            vscode.window.showInformationMessage(`Restarting service: ${serviceItem.unit.unit}`);
            try {
                const response = await axios.post(`${systemdServiceUrl}/restart`, { serviceName: serviceItem.unit.unit });
                vscode.window.showInformationMessage(response.data);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to restart service: ${(error as Error).message}`);
                console.error(`Failed to restart service: ${(error as Error).message}`);
            }
            serviceTreeDataProvider.refresh();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('systemd-manager.viewServiceStatus', async (serviceItem: ServiceTreeItem) => {
            try {
                const response = await axios.get(`${systemdServiceUrl}/status/${serviceItem.unit.unit}`);
                outputChannel.clear();
                outputChannel.appendLine(response.data);
                outputChannel.show();
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to fetch service status: ${(error as Error).message}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('systemd-manager.refreshServices', () => {
            vscode.window.showInformationMessage('Refreshing services...');
            serviceTreeDataProvider.refresh();
        })
    );
}

export function deactivate() {
    // Optionally implement logic to stop the server/relay process if needed
}