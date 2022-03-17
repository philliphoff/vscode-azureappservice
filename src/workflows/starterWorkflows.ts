import * as vscode from 'vscode';
import { SiteTreeItem } from '../tree/SiteTreeItem';
import { WebAppTreeItem } from '../tree/WebAppTreeItem';
import { GitHubActionsApi, GitHubActionsApiManager } from './api';
import { ext } from '../extensionVariables';
import { IActionContext } from '@microsoft/vscode-azext-utils';
import { createWebSiteClient } from '../utils/azureClients';
import { tryGetCsprojFile } from '../commands/deploy/dotnet/tryGetCsprojFile';
import { tryGetTargetFramework } from '../commands/deploy/dotnet/setPreDeployConfigForDotnet';
import { IDeployContext } from '@microsoft/vscode-azext-azureappservice';

function transformContent(content: string, transforms: [RegExp, string][]): string {
    for (const transform of transforms) {
        const [from, to] = transform;

        content = content.replace(from, to);
    }

    return content;
}

export async function registerStarterWorkflowTemplates(actionContext: IActionContext): Promise<void> {
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

                            const node: SiteTreeItem = await ext.tree.showTreeItemPicker<SiteTreeItem>(WebAppTreeItem.contextValue, actionContext);

                            if (!node) {
                                return;
                            }

                            // NOTE: SiteClient doesn't wrap/expose the command to return the publish XML.
                            const client = await createWebSiteClient([actionContext, node.site.subscription]);

                            const xmlResponse = node.site.slotName
                                ? await client.webApps.listPublishingProfileXmlWithSecretsSlot(node.site.resourceGroup, node.site.siteName, node.site.slotName, {})
                                : await client.webApps.listPublishingProfileXmlWithSecrets(node.site.resourceGroup, node.site.siteName, {});

                            if (!xmlResponse.readableStreamBody) {
                                throw new Error('Unable to get the publish XML.');
                            }

                            const xmlStream = xmlResponse.readableStreamBody;

                            const xml = await new Promise<string>(
                                (resolve, reject) => {
                                    let xmlString = '';

                                    xmlStream.on('data', (chunk: Buffer | string) => xmlString += chunk.toString());

                                    xmlStream.on('end', () => resolve(xmlString));

                                    xmlStream.on('error', err => reject(err));
                                });

                            await context.setSecret('AZURE_WEBAPP_PUBLISH_PROFILE', xml);

                            const transforms: [RegExp, string][] = [[/your-app-name/, node.site.siteName]];

                            // TODO: Pass through the workspace.
                            const workspace = vscode.workspace.workspaceFolders?.[0];

                            if (workspace) {
                                const csprojFile = await tryGetCsprojFile(actionContext as IDeployContext, workspace.uri.fsPath);

                                if (csprojFile) {
                                    // TODO: This extracts the target framework directly from the project file rather than evaluating it.
                                    const targetFramework = await tryGetTargetFramework(csprojFile);

                                    if (targetFramework) {
                                        const frameworkMap: { [key: string]: string } = {
                                            'net5.0': '5.0.406',
                                            'net6.0': '6.0.201'
                                        };

                                        const dotNetVersion = frameworkMap[targetFramework];

                                        if (dotNetVersion) {
                                            transforms.push([/DOTNET_VERSION: '5'/, `DOTNET_VERSION: '${dotNetVersion}'`]);
                                        }
                                    }
                                }
                            }

                            const content = transformContent(context.content, transforms);

                            // Expose suggested file name.
                            await context.createWorkflowFile(context.suggestedFileName ?? 'azure-webapps-dotnet-core.yml', content);
                        }
                    });
            }
        }
    }
}
