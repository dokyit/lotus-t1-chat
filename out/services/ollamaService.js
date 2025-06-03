"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaModelProvider = void 0;
const vscode = __importStar(require("vscode"));
const axios_1 = __importDefault(require("axios"));
/**
 * Implementation of ModelProvider for Ollama
 */
class OllamaModelProvider {
    context;
    configSection = 'lotusT1Chat';
    baseUrl = 'http://localhost:11434';
    selectedModel = 'deepseek-r1:7b';
    availableModels = [];
    constructor(context) {
        this.context = context;
    }
    get name() {
        return 'Ollama';
    }
    async initialize(context) {
        this.context = context;
        // Load configuration
        const config = vscode.workspace.getConfiguration(this.configSection);
        this.baseUrl = config.get('ollamaUrl', 'http://localhost:11434');
        this.selectedModel = config.get('ollamaModel', 'deepseek-r1:7b');
        // Fetch available models
        try {
            await this.refreshAvailableModels();
        }
        catch (error) {
            console.error('Failed to fetch Ollama models:', error);
        }
    }
    isConfigured() {
        // Check if Ollama is reachable
        return this.baseUrl !== '';
    }
    async promptForConfiguration() {
        const action = await vscode.window.showErrorMessage('Ollama configuration is incomplete or incorrect', 'Configure Now');
        if (action === 'Configure Now') {
            vscode.commands.executeCommand('workbench.action.openSettings', `${this.configSection}.ollamaUrl`);
            return true;
        }
        return false;
    }
    async getAvailableModels() {
        // Return cached models or refresh if empty
        if (this.availableModels.length === 0) {
            await this.refreshAvailableModels();
        }
        return this.availableModels;
    }
    async getSelectedModel() {
        const models = await this.getAvailableModels();
        return models.find(m => m.id === this.selectedModel) || {
            id: this.selectedModel,
            name: this.selectedModel,
            description: 'Custom model'
        };
    }
    async setModel(modelId) {
        this.selectedModel = modelId;
        // Save to configuration
        const config = vscode.workspace.getConfiguration(this.configSection);
        await config.update('ollamaModel', modelId, vscode.ConfigurationTarget.Global);
    }
    async sendMessage(messages) {
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
            const response = await axios_1.default.post(`${this.baseUrl}/api/chat`, {
                model: this.selectedModel,
                messages: chatMessages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
                system: systemPrompt,
                stream: false
            });
            return response.data.message.content;
        }
        catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }
    /**
     * Refresh the list of available models from Ollama
     */
    async refreshAvailableModels() {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/api/tags`);
            this.availableModels = response.data.models.map(model => ({
                id: model.name,
                name: model.name,
                description: `${model.details.family} (${model.details.parameter_size})`,
                details: model.details
            }));
        }
        catch (error) {
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
    handleApiError(error) {
        if (axios_1.default.isAxiosError(error)) {
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
exports.OllamaModelProvider = OllamaModelProvider;
//# sourceMappingURL=ollamaService.js.map