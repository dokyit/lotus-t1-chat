import * as vscode from 'vscode';

/**
 * Interface for chat messages exchanged with the model
 */
export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

/**
 * Model information interface
 */
export interface ModelInfo {
    id: string;
    name: string;
    description?: string;
    // Optional fields for provider-specific attributes
    [key: string]: any;
}

/**
 * Interface for model providers (Deepseek, Ollama, OpenRouter)
 */
export interface ModelProvider {
    /**
     * Name of the provider
     */
    readonly name: string;
    
    /**
     * Initialize the provider
     * @param context Extension context
     */
    initialize(context: vscode.ExtensionContext): Promise<void>;
    
    /**
     * Check if the provider is properly configured
     */
    isConfigured(): boolean;
    
    /**
     * Prompt the user to configure the provider
     * @returns True if the user initiated configuration, false otherwise
     */
    promptForConfiguration(): Promise<boolean>;
    
    /**
     * Get available models from this provider
     * @returns List of available models
     */
    getAvailableModels(): Promise<ModelInfo[]>;
    
    /**
     * Get the currently selected model
     * @returns The selected model info
     */
    getSelectedModel(): Promise<ModelInfo>;
    
    /**
     * Set the model to use
     * @param modelId ID of the model to use
     */
    setModel(modelId: string): Promise<void>;
    
    /**
     * Send a message to the model
     * @param messages Chat history
     * @returns The model's response
     */
    sendMessage(messages: ChatMessage[]): Promise<string>;
}

/**
 * Adapter for Deepseek model provider
 */
class DeepseekModelAdapter implements ModelProvider {
    private service: any;
    constructor(context: vscode.ExtensionContext) {
        const { DeepseekService } = require('./deepseekService');
        this.service = new DeepseekService(context);
    }
    get name() { return 'Deepseek'; }
    async initialize(context: vscode.ExtensionContext) { /* no-op */ }
    isConfigured() { return this.service.isConfigured(); }
    async promptForConfiguration() { return this.service.promptForApiKey(); }
    async getAvailableModels() { return [{ id: 'deepseek-r1/latest', name: 'Deepseek r1' }]; }
    async getSelectedModel() { return { id: 'deepseek-r1/latest', name: 'Deepseek r1' }; }
    async setModel(modelId: string) { /* no-op */ }
    async sendMessage(messages: ChatMessage[]) { return this.service.sendMessage(messages); }
}

/**
 * Factory for creating model providers
 */
export class ModelProviderFactory {
    /**
     * Create a model provider based on the configuration
     * @param context Extension context
     * @returns The created model provider
     *
     * To use your local Ollama models, set the following in your VS Code settings:
     *   "lotusT1Chat.modelProvider": "ollama"
     * Ensure Ollama is running and your models are pulled locally.
     */
    static async createProvider(context: vscode.ExtensionContext): Promise<ModelProvider> {
        const config = vscode.workspace.getConfiguration('lotusT1Chat');
        const provider = config.get<string>('modelProvider', 'ollama');
        switch (provider) {
            case 'ollama':
                const { OllamaModelProvider } = await import('./ollamaService.js');
                return new OllamaModelProvider(context);
            case 'openRouter':
                const { OpenRouterModelProvider } = await import('./openRouterService.js');
                return new OpenRouterModelProvider(context);
            case 'deepseek':
                return new DeepseekModelAdapter(context);
            case 'simulation':
                const { SimulationModelProvider } = await import('./simulationService.js');
                return new SimulationModelProvider(context);
            case 'mcp':
                const { MCPModelProvider } = await import('./mcpService.js');
                return new MCPModelProvider(context);
            default:
                throw new Error(`Unknown model provider: ${provider}`);
        }
    }
}
