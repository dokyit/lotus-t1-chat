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
exports.OpenRouterModelProvider = void 0;
const vscode = __importStar(require("vscode"));
const axios_1 = __importDefault(require("axios"));
/**
 * Implementation of ModelProvider for OpenRouter
 */
class OpenRouterModelProvider {
    context;
    apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    configSection = 'lotusT1Chat';
    apiKeyConfigName = 'openRouterApiKey';
    selectedModel = 'anthropic/claude-3-haiku';
    availableModels = [];
    constructor(context) {
        this.context = context;
    }
    get name() {
        return 'OpenRouter';
    }
    async initialize(context) {
        this.context = context;
        // Load configuration
        const config = vscode.workspace.getConfiguration(this.configSection);
        this.selectedModel = config.get('openRouterModel', 'anthropic/claude-3-haiku');
        // Fetch available models
        try {
            await this.refreshAvailableModels();
        }
        catch (error) {
            console.error('Failed to fetch OpenRouter models:', error);
            // Use default models
            this.setDefaultModels();
        }
    }
    isConfigured() {
        return !!this.getApiKey();
    }
    async promptForConfiguration() {
        const action = await vscode.window.showErrorMessage('OpenRouter API key is not configured', 'Configure Now');
        if (action === 'Configure Now') {
            vscode.commands.executeCommand('workbench.action.openSettings', `${this.configSection}.${this.apiKeyConfigName}`);
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
        await config.update('openRouterModel', modelId, vscode.ConfigurationTarget.Global);
    }
    async sendMessage(messages) {
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
            const response = await axios_1.default.post(this.apiUrl, {
                model: this.selectedModel,
                messages: chatMessages,
                stream: false
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }
            });
            return response.data.choices[0].message.content;
        }
        catch (error) {
            this.handleApiError(error);
            throw error;
        }
    }
    /**
     * Get the API key from configuration
     */
    getApiKey() {
        const config = vscode.workspace.getConfiguration(this.configSection);
        const apiKey = config.get(this.apiKeyConfigName);
        // Return undefined if empty string or not set
        return apiKey && apiKey.trim() !== '' ? apiKey.trim() : undefined;
    }
    /**
     * Refresh the list of available models from OpenRouter
     */
    async refreshAvailableModels() {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            this.setDefaultModels();
            return;
        }
        try {
            const response = await axios_1.default.get('https://openrouter.ai/api/v1/models', {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://github.com/lotus-t1-chat',
                    'X-Title': 'Lotus T1 Chat VS Code Extension'
                }
            });
            this.availableModels = response.data.data.map(model => ({
                id: model.id,
                name: model.name,
                description: model.description || `Context: ${model.context_length} tokens`,
                context_length: model.context_length,
                pricing: model.pricing
            }));
        }
        catch (error) {
            console.error('Failed to fetch OpenRouter models:', error);
            this.setDefaultModels();
        }
    }
    /**
     * Set default models when API is not available
     */
    setDefaultModels() {
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
    handleApiError(error) {
        if (axios_1.default.isAxiosError(error)) {
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
exports.OpenRouterModelProvider = OpenRouterModelProvider;
//# sourceMappingURL=openRouterService.js.map