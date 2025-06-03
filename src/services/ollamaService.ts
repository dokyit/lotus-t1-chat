import * as vscode from 'vscode';
import axios from 'axios';
import { ChatMessage, ModelInfo, ModelProvider } from './modelProvider';

interface OllamaModelInfo {
    name: string;
    modified_at: string;
    size: number;
    digest: string;
    details: {
        family: string;
        families: string[];
        parameter_size: string;
        quantization_level: string;
    };
}

interface OllamaResponse {
    model: string;
    created_at: string;
    message: {
        role: string;
        content: string;
    };
    done: boolean;
}

/**
 * Implementation of ModelProvider for Ollama
 */
export class OllamaModelProvider implements ModelProvider {
    private readonly configSection = 'lotusT1Chat';
    private baseUrl: string = 'http://localhost:11434';
    private selectedModel: string = 'deepseek-r1:7b';
    private availableModels: ModelInfo[] = [];
    
    constructor(private context: vscode.ExtensionContext) {}
    
    get name(): string {
        return 'Ollama';
    }
    
    async initialize(context: vscode.ExtensionContext): Promise<void> {
        this.context = context;
        
        // Load configuration
        const config = vscode.workspace.getConfiguration(this.configSection);
        this.baseUrl = config.get<string>('ollamaUrl', 'http://localhost:11434');
        this.selectedModel = config.get<string>('ollamaModel', 'deepseek-r1:7b');
        
        // Fetch available models
        try {
            await this.refreshAvailableModels();
        } catch (error) {
            console.error('Failed to fetch Ollama models:', error);
        }
    }
    
    isConfigured(): boolean {
        // Check if Ollama is reachable
        return this.baseUrl !== '';
    }
    
    async promptForConfiguration(): Promise<boolean> {
        const action = await vscode.window.showErrorMessage(
            'Ollama configuration is incomplete or incorrect',
            'Configure Now'
        );
        
        if (action === 'Configure Now') {
            vscode.commands.executeCommand(
                'workbench.action.openSettings', 
                `${this.configSection}.ollamaUrl`
            );
            return true;
        }
        
        return false;
    }
    
    async getAvailableModels(): Promise<ModelInfo[]> {
        // Return cached models or refresh if empty
        if (this.availableModels.length === 0) {
            await this.refreshAvailableModels();
        }
        return this.availableModels;
    }
    
    async getSelectedModel(): Promise<ModelInfo> {
        const models = await this.getAvailableModels();
        return models.find(m => m.id === this.selectedModel) || {
            id: this.selectedModel,
            name: this.selectedModel,
            description: 'Custom model'
        };
    }
    
    async setModel(modelId: string): Promise<void> {
        this.selectedModel = modelId;
        
        // Save to configuration
        const config = vscode.workspace.getConfiguration(this.configSection);
        await config.update('ollamaModel', modelId, vscode.ConfigurationTarget.Global);
    }
    
    async sendMessage(messages: ChatMessage[]): Promise<string> {
        try {
            // Format messages for Ollama API
            // Ollama expects a specific format with a system prompt
            let systemPrompt = 'You are a helpful assistant. Answer questions clearly and concisely, without unnecessary elaboration.';
            
            // Extract system message if present
            const systemMessages = messages.filter(m => m.role === 'system');
            if (systemMessages.length > 0) {
                systemPrompt = systemMessages[0].content;
            }
            
            // Filter out system messages for the regular messages array
            const chatMessages = messages.filter(m => m.role !== 'system');
            
            const response = await axios.post<OllamaResponse>(
                `${this.baseUrl}/api/chat`,
                {
                    model: this.selectedModel,
                    messages: chatMessages.map(msg => ({
                        role: msg.role,
                        content: msg.content
                    })),
                    system: systemPrompt,
                    stream: false
                }
            );
            
            return response.data.message.content;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }
    
    /**
     * Refresh the list of available models from Ollama
     */
    private async refreshAvailableModels(): Promise<void> {
        try {
            const response = await axios.get<{ models: OllamaModelInfo[] }>(
                `${this.baseUrl}/api/tags`
            );
            
            this.availableModels = response.data.models.map(model => ({
                id: model.name,
                name: model.name,
                description: `${model.details.family} (${model.details.parameter_size})`,
                details: model.details
            }));
        } catch (error) {
            console.error('Failed to fetch Ollama models:', error);
            // Set some default models in case API fails
            this.availableModels = [
                { id: 'llama3', name: 'Llama 3', description: 'Meta Llama 3 model' },
                { id: 'mistral', name: 'Mistral', description: 'Mistral model' },
                { id: 'gemma', name: 'Gemma', description: 'Google Gemma model' }
            ];
        }
    }
    
    /**
     * Handle API errors with user-friendly messages
     */
    private handleApiError(error: any): void {
        if (axios.isAxiosError(error)) {
            if (!error.response) {
                // Network error
                throw new Error(`Could not connect to Ollama at ${this.baseUrl}. Make sure Ollama is running.`);
            }
            
            const status = error.response.status;
            switch (status) {
                case 404:
                    throw new Error(`Model '${this.selectedModel}' not found. Try installing it with 'ollama pull ${this.selectedModel}'.`);
                case 500:
                    throw new Error(`Ollama server error: ${error.response.data.error || 'Unknown error'}`);
                default:
                    throw new Error(`Ollama API error (${status}): ${error.response.data.error || 'Unknown error'}`);
            }
        }
        
        throw new Error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
}

