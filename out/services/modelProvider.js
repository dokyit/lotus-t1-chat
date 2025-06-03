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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelProviderFactory = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Adapter for Deepseek model provider
 */
class DeepseekModelAdapter {
    service;
    constructor(context) {
        const { DeepseekService } = require('./deepseekService');
        this.service = new DeepseekService(context);
    }
    get name() { return 'Deepseek'; }
    async initialize(context) { }
    isConfigured() { return this.service.isConfigured(); }
    async promptForConfiguration() { return this.service.promptForApiKey(); }
    async getAvailableModels() { return [{ id: 'deepseek-r1/latest', name: 'Deepseek r1' }]; }
    async getSelectedModel() { return { id: 'deepseek-r1/latest', name: 'Deepseek r1' }; }
    async setModel(modelId) { }
    async sendMessage(messages) { return this.service.sendMessage(messages); }
}
/**
 * Factory for creating model providers
 */
class ModelProviderFactory {
    /**
     * Create a model provider based on the configuration
     * @param context Extension context
     * @returns The created model provider
     *
     * To use your local Ollama models, set the following in your VS Code settings:
     *   "lotusT1Chat.modelProvider": "ollama"
     * Ensure Ollama is running and your models are pulled locally.
     */
    static async createProvider(context) {
        const config = vscode.workspace.getConfiguration('lotusT1Chat');
        const provider = config.get('modelProvider', 'ollama');
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
exports.ModelProviderFactory = ModelProviderFactory;
//# sourceMappingURL=modelProvider.js.map