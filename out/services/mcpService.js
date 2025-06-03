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
exports.MCPModelProvider = void 0;
const vscode = __importStar(require("vscode"));
const axios_1 = __importDefault(require("axios"));
class MCPModelProvider {
    configSection = 'lotusT1Chat';
    endpoint = '';
    apiKey = '';
    selectedModel = '';
    availableModels = [];
    context;
    constructor(context) {
        this.context = context;
    }
    get name() {
        return 'MCP';
    }
    async initialize(context) {
        this.context = context;
        const config = vscode.workspace.getConfiguration(this.configSection);
        this.endpoint = config.get('mcpEndpoint', 'http://localhost:8080/v1/chat/completions');
        this.apiKey = config.get('mcpApiKey', '');
        this.selectedModel = config.get('mcpModel', '');
        // Optionally fetch available models from MCP server
        // this.availableModels = await this.fetchAvailableModels();
    }
    isConfigured() {
        return !!this.endpoint && !!this.selectedModel;
    }
    async sendMessage(messages) {
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
        const headers = { 'Content-Type': 'application/json' };
        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }
        const response = await axios_1.default.post(this.endpoint, payload, { headers });
        // Standard OpenAI/MCP response shape
        return response.data.choices?.[0]?.message?.content || 'No response from MCP.';
    }
    async setModel(modelId) {
        this.selectedModel = modelId;
        const config = vscode.workspace.getConfiguration(this.configSection);
        await config.update('mcpModel', modelId, vscode.ConfigurationTarget.Global);
    }
    async getSelectedModel() {
        return { id: this.selectedModel, name: this.selectedModel };
    }
    async getAvailableModels() {
        // Optionally implement fetching models from MCP server
        return this.availableModels.length ? this.availableModels : [{ id: this.selectedModel, name: this.selectedModel }];
    }
    async promptForConfiguration() {
        await vscode.commands.executeCommand('workbench.action.openSettings', 'lotusT1Chat.mcpEndpoint');
        return true;
    }
}
exports.MCPModelProvider = MCPModelProvider;
//# sourceMappingURL=mcpService.js.map