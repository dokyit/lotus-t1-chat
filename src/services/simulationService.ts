import * as vscode from 'vscode';
import { ChatMessage, ModelInfo, ModelProvider } from './modelProvider';

/**
 * Simulation model provider for testing without actual API calls
 */
export class SimulationModelProvider implements ModelProvider {
    private selectedModel: string = 'gpt-4-simulation';
    private availableModels: ModelInfo[] = [
        { id: 'gpt-4-simulation', name: 'GPT-4 (Simulated)', description: 'Simulated version of GPT-4' },
        { id: 'claude-simulation', name: 'Claude (Simulated)', description: 'Simulated version of Claude' },
        { id: 'llama-simulation', name: 'Llama (Simulated)', description: 'Simulated version of Llama' }
    ];
    
    constructor(private context: vscode.ExtensionContext) {}
    
    get name(): string {
        return 'Simulation';
    }
    
    async initialize(context: vscode.ExtensionContext): Promise<void> {
        this.context = context;
        
        // Load selected model from settings
        const config = vscode.workspace.getConfiguration('lotusT1Chat');
        this.selectedModel = config.get<string>('simulationModel', 'gpt-4-simulation');
    }
    
    isConfigured(): boolean {
        return true; // Simulation is always configured
    }
    
    async promptForConfiguration(): Promise<boolean> {
        return true; // No configuration needed
    }
    
    async getAvailableModels(): Promise<ModelInfo[]> {
        return this.availableModels;
    }
    
    async getSelectedModel(): Promise<ModelInfo> {
        return this.availableModels.find(m => m.id === this.selectedModel) || this.availableModels[0];
    }
    
    async setModel(modelId: string): Promise<void> {
        if (this.availableModels.some(m => m.id === modelId)) {
            this.selectedModel = modelId;
            
            // Save to configuration
            const config = vscode.workspace.getConfiguration('lotusT1Chat');
            await config.update('simulationModel', modelId, vscode.ConfigurationTarget.Global);
        }
    }
    
    async sendMessage(messages: ChatMessage[]): Promise<string> {
        // Find the last user message
        const lastUser = messages.slice().reverse().find(m => m.role === 'user');
        if (!lastUser) {
            return 'I did not receive a user message.';
        }
        // Simulate a basic response (paraphrase or echo)
        return `You said: "${lastUser.content}".`;
    }
}

