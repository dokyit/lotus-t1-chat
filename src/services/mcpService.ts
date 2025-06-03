import * as vscode from 'vscode';
import axios from 'axios';
import { ChatMessage, ModelInfo, ModelProvider } from './modelProvider';

export class MCPModelProvider implements ModelProvider {
    private readonly configSection = 'lotusT1Chat';
    private endpoint: string = '';
    private apiKey: string = '';
    private selectedModel: string = '';
    private availableModels: ModelInfo[] = [];
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    get name(): string {
        return 'MCP';
    }

    async initialize(context: vscode.ExtensionContext): Promise<void> {
        this.context = context;
        const config = vscode.workspace.getConfiguration(this.configSection);
        this.endpoint = config.get<string>('mcpEndpoint', 'http://localhost:8080/v1/chat/completions');
        this.apiKey = config.get<string>('mcpApiKey', '');
        this.selectedModel = config.get<string>('mcpModel', '');
        // Optionally fetch available models from MCP server
        // this.availableModels = await this.fetchAvailableModels();
    }

    isConfigured(): boolean {
        return !!this.endpoint && !!this.selectedModel;
    }

    async sendMessage(messages: ChatMessage[]): Promise<string> {
        const systemPrompt = "You are a helpful assistant. Answer questions clearly and concisely, without unnecessary elaboration.";
        const mcpMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.filter(m => m.role !== 'system')
        ];
        const payload = {
            model: this.selectedModel,
            messages: mcpMessages,
            stream: false
        };
        const headers: any = { 'Content-Type': 'application/json' };
        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }
        const response = await axios.post(this.endpoint, payload, { headers });
        // Standard OpenAI/MCP response shape
        return response.data.choices?.[0]?.message?.content || 'No response from MCP.';
    }

    async setModel(modelId: string): Promise<void> {
        this.selectedModel = modelId;
        const config = vscode.workspace.getConfiguration(this.configSection);
        await config.update('mcpModel', modelId, vscode.ConfigurationTarget.Global);
    }

    async getSelectedModel(): Promise<ModelInfo> {
        return { id: this.selectedModel, name: this.selectedModel };
    }

    async getAvailableModels(): Promise<ModelInfo[]> {
        // Optionally implement fetching models from MCP server
        return this.availableModels.length ? this.availableModels : [{ id: this.selectedModel, name: this.selectedModel }];
    }

    async promptForConfiguration(): Promise<boolean> {
        await vscode.commands.executeCommand('workbench.action.openSettings', 'lotusT1Chat.mcpEndpoint');
        return true;
    }
}
