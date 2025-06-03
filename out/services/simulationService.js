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
exports.SimulationModelProvider = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Simulation model provider for testing without actual API calls
 */
class SimulationModelProvider {
    context;
    selectedModel = 'gpt-4-simulation';
    availableModels = [
        { id: 'gpt-4-simulation', name: 'GPT-4 (Simulated)', description: 'Simulated version of GPT-4' },
        { id: 'claude-simulation', name: 'Claude (Simulated)', description: 'Simulated version of Claude' },
        { id: 'llama-simulation', name: 'Llama (Simulated)', description: 'Simulated version of Llama' }
    ];
    constructor(context) {
        this.context = context;
    }
    get name() {
        return 'Simulation';
    }
    async initialize(context) {
        this.context = context;
        // Load selected model from settings
        const config = vscode.workspace.getConfiguration('lotusT1Chat');
        this.selectedModel = config.get('simulationModel', 'gpt-4-simulation');
    }
    isConfigured() {
        return true; // Simulation is always configured
    }
    async promptForConfiguration() {
        return true; // No configuration needed
    }
    async getAvailableModels() {
        return this.availableModels;
    }
    async getSelectedModel() {
        return this.availableModels.find(m => m.id === this.selectedModel) || this.availableModels[0];
    }
    async setModel(modelId) {
        if (this.availableModels.some(m => m.id === modelId)) {
            this.selectedModel = modelId;
            // Save to configuration
            const config = vscode.workspace.getConfiguration('lotusT1Chat');
            await config.update('simulationModel', modelId, vscode.ConfigurationTarget.Global);
        }
    }
    async sendMessage(messages) {
        // Find the last user message
        const lastUser = messages.slice().reverse().find(m => m.role === 'user');
        if (!lastUser) {
            return 'I did not receive a user message.';
        }
        // Simulate a basic response (paraphrase or echo)
        return `You said: "${lastUser.content}".`;
    }
}
exports.SimulationModelProvider = SimulationModelProvider;
//# sourceMappingURL=simulationService.js.map