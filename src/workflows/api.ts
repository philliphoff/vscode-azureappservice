import * as vscode from "vscode";

export interface WorkflowResult<T> {
    result?: T;
    succeeded: boolean;
}

export interface WorkflowCreationContext {
    readonly callerContext?: never;

    createWorkflowFromContent(suggestedFileName: string, content: string): Promise<WorkflowResult<vscode.Uri>>;

    /**
     * Sets or updates an actions secret in the GitHub repository.
     *
     * @param suggestedName The suggested name for the secret.
     * @param value The value of the secret.
     *
     * @returns The actual name of the created/set secret.
     */
    setSecret(suggestedName: string, value: string): Promise<WorkflowResult<string>>;
}

export interface StarterWorkflowCreationContext extends WorkflowCreationContext {
    readonly content: string;
}

export interface WorkflowTemplateDefinition {
    readonly description: string;
    readonly group: { id: string, label: string};
    readonly id: string;
    readonly label: string;

    onCreate(context: WorkflowCreationContext): Promise<void>;
}

export interface StarterWorkflowTemplateDefinition {
    readonly id: string;

    onCreate(context: StarterWorkflowCreationContext): Promise<void>;
}

export interface GitHubActionsApi {
    createWorkflowFromTemplate(templateId: string, callerContext?: never): Promise<void>;

    registerStarterWorkflowTemplate(definition: StarterWorkflowTemplateDefinition): vscode.Disposable;
    registerWorkflowTemplate(definition: WorkflowTemplateDefinition): vscode.Disposable;
}

export interface GitHubActionsApiManager {
    getApi<T>(version: string): T | undefined
}
