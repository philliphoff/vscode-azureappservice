import * as vscode from 'vscode';
import { GitHubActionsApi, GitHubActionsApiManager } from './api';

export async function registerStarterWorkflowTemplates(): Promise<void> {
    const gitHubActionsExtension = vscode.extensions.getExtension('cschleiden.vscode-github-actions');

    if (gitHubActionsExtension) {
        await gitHubActionsExtension.activate();

        const manager: GitHubActionsApiManager | undefined = gitHubActionsExtension.exports as GitHubActionsApiManager;

        if (manager) {
            const api: GitHubActionsApi | undefined = manager.getApi(1);

            if (api) {
                api.registerWorkflowProvider(
                    'deployments/azure-webapps-dotnet-core',
                    {
                        createWorkflow: async (context): Promise<void> => {
                            if (!context.content) {
                                throw new Error('Unable to get the starter workflow content.');
                            }

                            await context.setSecret('AZURE_WEBAPP_PUBLISH_PROFILE', 'My Publish Profile');

                            // Expose suggested file name.
                            await context.createWorkflowFile(context.suggestedFileName ?? 'azure-webapps-dotnet-core.yml', context.content);
                        }
                    });
            }
        }
    }
}
