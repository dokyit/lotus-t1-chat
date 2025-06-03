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
exports.DeepseekService = void 0;
const vscode = __importStar(require("vscode"));
const axios_1 = __importDefault(require("axios"));
/**
 * Service to interact with the Deepseek API
 *
 * IMPORTANT: Currently running in simulation mode for testing.
 * When you have real API credentials, update the constants below
 * and modify the sendMessage method to use the real API.
 */
class DeepseekService {
    context;
    // TODO: Update with the actual Deepseek API endpoint when available
    apiUrl = 'https://api.deepseek.com/v1/chat/completions';
    // TODO: Update with the actual model name when available
    model = 'deepseek-r1/latest';
    configSection = 'lotusT1Chat';
    apiKeyConfigName = 'apiKey';
    // Set to true to use simulation instead of real API calls
    useSimulation = true;
    /**
     * Creates a new DeepseekService
     * @param context The extension context
     */
    constructor(context) {
        this.context = context;
    }
    /**
     * Get the API key from configuration
     * @returns The API key or undefined if not set
     */
    getApiKey() {
        const config = vscode.workspace.getConfiguration(this.configSection);
        const apiKey = config.get(this.apiKeyConfigName);
        // Return undefined if empty string or not set
        return apiKey && apiKey.trim() !== '' ? apiKey.trim() : undefined;
    }
    /**
     * Check if the API key is configured
     * @returns True if the API key is configured, false otherwise
     */
    isConfigured() {
        return !!this.getApiKey();
    }
    /**
     * Prompt the user to configure the API key
     * @returns True if the user clicked "Configure Now", false otherwise
     */
    async promptForApiKey() {
        const action = await vscode.window.showErrorMessage('Deepseek API key is not configured', 'Configure Now');
        if (action === 'Configure Now') {
            vscode.commands.executeCommand('workbench.action.openSettings', `${this.configSection}.${this.apiKeyConfigName}`);
            return true;
        }
        return false;
    }
    /**
     * Send messages to the Deepseek API or simulate a response for testing
     * @param messages The chat history
     * @returns A promise that resolves to the model's response
     * @throws Error if the API key is not configured or if the API call fails
     */
    async sendMessage(messages) {
        // Get API key and validate
        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new Error('API key not configured');
        }
        // Use simulation mode for testing
        if (this.useSimulation) {
            return this.simulateResponse(messages);
        }
        try {
            // Call the Deepseek API
            const response = await axios_1.default.post(this.apiUrl, {
                model: this.model,
                messages: messages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
                temperature: 0.7,
                max_tokens: 1000,
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }
            });
            // Return the response content
            return response.data.choices[0].message.content;
        }
        catch (error) {
            // Handle specific error cases
            if (axios_1.default.isAxiosError(error)) {
                if (error.response) {
                    switch (error.response.status) {
                        case 401:
                            throw new Error('Invalid API key. Please check your configuration.');
                        case 429:
                            throw new Error('Rate limit exceeded. Please try again later.');
                        case 500:
                        case 502:
                        case 503:
                        case 504:
                            throw new Error('Deepseek API service is currently unavailable. Please try again later.');
                        default:
                            throw new Error(`API request failed: ${error.response.status} ${error.response.statusText}`);
                    }
                }
                else if (error.request) {
                    throw new Error('Network error. Please check your internet connection.');
                }
            }
            // For any other type of error
            throw new Error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * For testing: simulate a response without making an actual API call
     * This is currently used by default until the real API integration is complete.
     *
     * To switch to the real API:
     * 1. Set this.useSimulation = false in the class declaration
     * 2. Update apiUrl and model with correct values
     * 3. Verify the API request format matches Deepseek's requirements
     *
     * @param messages The chat history
     * @returns A simulated response
     */
    async simulateResponse(messages) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        const lastMessage = messages[messages.length - 1].content;
        // Generate a mock response based on the last message
        if (lastMessage.toLowerCase().includes('hello') || lastMessage.toLowerCase().includes('hi')) {
            return 'Hello! How can I assist you today?';
        }
        else if (lastMessage.toLowerCase().includes('help')) {
            return 'I\'m here to help! What do you need assistance with?';
        }
        else if (lastMessage.toLowerCase().includes('?')) {
            return 'That\'s an interesting question. Let me think about it... In the Deepseek r1 model, I would provide a detailed and accurate response based on my training data.';
        }
        else {
            return `I understand you said: "${lastMessage}". As the Deepseek r1 model, I would analyze this input and provide a thoughtful and helpful response.`;
        }
    }
}
exports.DeepseekService = DeepseekService;
//# sourceMappingURL=deepseekService.js.map