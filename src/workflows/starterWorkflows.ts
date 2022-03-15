import * as vscode from 'vscode';
import { GitHubActionsApi, GitHubActionsApiManager } from './api';

export async function registerStarterWorkflowTemplates(): Promise<void> {
    const gitHubActionsExtension = vscode.extensions.getExtension('cschleiden.vscode-github-actions');

    if (gitHubActionsExtension) {
        await gitHubActionsExtension.activate();

        const manager: GitHubActionsApiManager | undefined = gitHubActionsExtension.exports as GitHubActionsApiManager;

        if (manager) {
            const api: GitHubActionsApi | undefined = manager.getApi('1.0.0');

            if (api) {
                api.registerStarterWorkflowTemplate({
                    id: 'deployments/azure-webapps-dotnet-core',
                    onCreate: async (context): Promise<void> => {
                        await context.setSecret('AZURE_WEBAPP_PUBLISH_PROFILE', 'My Publish Profile');

                        // Expose suggested file name.
                        await context.createWorkflowFromContent('starter-template.yml', context.content);
                    }
                });
            }
        }
    }
}
