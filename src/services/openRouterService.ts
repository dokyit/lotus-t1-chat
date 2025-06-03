import * as vscode from 'vscode';
import axios from 'axios';
import { ChatMessage, ModelInfo, ModelProvider } from './modelProvider';

interface OpenRouterModel {
    id: string;
    name: string;
    description?: string;
    context_length: number;
    pricing?: {
        prompt: number;
        completion: number;
    };
}

interface OpenRouterResponse {
    id: string;
    choices: {
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }[];
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

/**
 * Implementation of ModelProvider for OpenRouter
 */
export class OpenRouterModelProvider implements ModelProvider {
    private readonly apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    private readonly configSection = 'lotusT1Chat';
    private readonly apiKeyConfigName = 'openRouterApiKey';
    private selectedModel: string = 'anthropic/claude-3-haiku';
    private availableModels: ModelInfo[] = [];
    
    constructor(private context: vscode.ExtensionContext) {}
    
    get name(): string {
        return 'OpenRouter';
    }
    
    async initialize(context: vscode.ExtensionContext): Promise<void> {
        this.context = context;
        
        // Load configuration
        const config = vscode.workspace.getConfiguration(this.configSection);
        this.selectedModel = config.get<string>('openRouterModel', 'anthropic/claude-3-haiku');
        
        // Fetch available models
        try {
            await this.refreshAvailableModels();
        } catch (error) {
            console.error('Failed to fetch OpenRouter models:', error);
            // Use default models
            this.setDefaultModels();
        }
    }
    
    isConfigured(): boolean {
        return !!this.getApiKey();
    }
    
    async promptForConfiguration(): Promise<boolean> {
        const action = await vscode.window.showErrorMessage(
            'OpenRouter API key is not configured',
            'Configure Now'
        );
        
        if (action === 'Configure Now') {
            vscode.commands.executeCommand(
                'workbench.action.openSettings',
                `${this.configSection}.${this.apiKeyConfigName}`
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
        await config.update('openRouterModel', modelId, vscode.ConfigurationTarget.Global);
    }
    
    async sendMessage(messages: ChatMessage[]): Promise<string> {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new Error('OpenRouter API key not configured');
        }
        
        try {
            const systemPrompt = "You are a helpful assistant. Answer questions clearly and concisely, without unnecessary elaboration.";
            // Extract system message if present
            const systemMessages = messages.filter(m => m.role === 'system');
            let prompt = systemPrompt;
            if (systemMessages.length > 0) {
                prompt = systemMessages[0].content;
            }
            // Remove all system messages and prepend our prompt
            const chatMessages = [
                { role: 'system', content: prompt },
                ...messages.filter(m => m.role !== 'system')
            ];
            
            const response = await axios.post<OpenRouterResponse>(
                this.apiUrl,
                {
                    model: this.selectedModel,
                    messages: chatMessages,
                    stream: false
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    }
                }
            );
            
            return response.data.choices[0].message.content;
        } catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }
    
    /**
     * Get the API key from configuration
     */
    private getApiKey(): string | undefined {
        const config = vscode.workspace.getConfiguration(this.configSection);
        const apiKey = config.get<string>(this.apiKeyConfigName);
        
        // Return undefined if empty string or not set
        return apiKey && apiKey.trim() !== '' ? apiKey.trim() : undefined;
    }
    
    /**
     * Refresh the list of available models from OpenRouter
     */
    private async refreshAvailableModels(): Promise<void> {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            this.setDefaultModels();
            return;
        }
        
        try {
            const response = await axios.get<{ data: OpenRouterModel[] }>(
                'https://openrouter.ai/api/v1/models',
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'HTTP-Referer': 'https://github.com/lotus-t1-chat',
                        'X-Title': 'Lotus T1 Chat VS Code Extension'
                    }
                }
            );
            
            this.availableModels = response.data.data.map(model => ({
                id: model.id,
                name: model.name,
                description: model.description || `Context: ${model.context_length} tokens`,
                context_length: model.context_length,
                pricing: model.pricing
            }));
        } catch (error) {
            console.error('Failed to fetch OpenRouter models:', error);
            this.setDefaultModels();
        }
    }
    
    /**
     * Set default models when API is not available
     */
    private setDefaultModels(): void {
        this.availableModels = [
            { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', description: 'Fast and affordable' },
            { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet', description: 'Balanced performance' },
            { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', description: 'Most powerful Claude model' },
            { id: 'google/gemini-pro', name: 'Gemini Pro', description: 'Google\'s advanced model' },
            { id: 'openai/gpt-4o', name: 'GPT-4o', description: 'OpenAI\'s most capable model' }
        ];
    }
    
    /**
     * Handle API errors with user-friendly messages
     */
    private handleApiError(error: any): void {
        if (axios.isAxiosError(error)) {
            if (!error.response) {
                throw new Error('Network error. Please check your internet connection.');
            }
            
            const status = error.response.status;
            const data = error.response.data;
            
            switch (status) {
                case 401:
                    throw new Error('Invalid OpenRouter API key. Please check your configuration.');
                case 402:
                    throw new Error('OpenRouter API credit exhausted or payment required.');
                case 429:
                    throw new Error('Rate limit exceeded. Please try again later.');
                case 500:
                case 502:
                case 503:
                    throw new Error('OpenRouter service is currently unavailable. Please try again later.');
                default:
                    throw new Error(`API error (${status}): ${data.error?.message || 'Unknown error'}`);
            }
        }
        
        throw new Error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
}

