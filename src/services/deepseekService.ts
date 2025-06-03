import * as vscode from 'vscode';
import axios from 'axios';

/**
 * Interface for chat messages exchanged with the model
 */
export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}
/**
 * Interface for Deepseek API response
 */
interface DeepseekResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: {
        index: number;
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
 * Service to interact with the Deepseek API
 * 
 * IMPORTANT: Currently running in simulation mode for testing.
 * When you have real API credentials, update the constants below
 * and modify the sendMessage method to use the real API.
 */
export class DeepseekService {
    // TODO: Update with the actual Deepseek API endpoint when available
    private readonly apiUrl = 'https://api.deepseek.com/v1/chat/completions';
    // TODO: Update with the actual model name when available
    private readonly model = 'deepseek-r1/latest';
    private readonly configSection = 'lotusT1Chat';
    private readonly apiKeyConfigName = 'apiKey';
    // Set to true to use simulation instead of real API calls
    private readonly useSimulation = true;

    /**
     * Creates a new DeepseekService
     * @param context The extension context
     */
    constructor(private context: vscode.ExtensionContext) {}

    /**
     * Get the API key from configuration
     * @returns The API key or undefined if not set
     */
    private getApiKey(): string | undefined {
        const config = vscode.workspace.getConfiguration(this.configSection);
        const apiKey = config.get<string>(this.apiKeyConfigName);
        
        // Return undefined if empty string or not set
        return apiKey && apiKey.trim() !== '' ? apiKey.trim() : undefined;
    }

    /**
     * Check if the API key is configured
     * @returns True if the API key is configured, false otherwise
     */
    public isConfigured(): boolean {
        return !!this.getApiKey();
    }

    /**
     * Prompt the user to configure the API key
     * @returns True if the user clicked "Configure Now", false otherwise
     */
    public async promptForApiKey(): Promise<boolean> {
        const action = await vscode.window.showErrorMessage(
            'Deepseek API key is not configured',
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

    /**
     * Send messages to the Deepseek API or simulate a response for testing
     * @param messages The chat history
     * @returns A promise that resolves to the model's response
     * @throws Error if the API key is not configured or if the API call fails
     */
    public async sendMessage(messages: ChatMessage[]): Promise<string> {
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
            const response = await axios.post<DeepseekResponse>(
                this.apiUrl,
                {
                    model: this.model,
                    messages: messages.map(msg => ({
                        role: msg.role,
                        content: msg.content
                    })),
                    temperature: 0.7,
                    max_tokens: 1000,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    }
                }
            );

            // Return the response content
            return response.data.choices[0].message.content;
        } catch (error) {
            // Handle specific error cases
            if (axios.isAxiosError(error)) {
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
                } else if (error.request) {
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
    public async simulateResponse(messages: ChatMessage[]): Promise<string> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const lastMessage = messages[messages.length - 1].content;
        
        // Generate a mock response based on the last message
        if (lastMessage.toLowerCase().includes('hello') || lastMessage.toLowerCase().includes('hi')) {
            return 'Hello! How can I assist you today?';
        } else if (lastMessage.toLowerCase().includes('help')) {
            return 'I\'m here to help! What do you need assistance with?';
        } else if (lastMessage.toLowerCase().includes('?')) {
            return 'That\'s an interesting question. Let me think about it... In the Deepseek r1 model, I would provide a detailed and accurate response based on my training data.';
        } else {
            return `I understand you said: "${lastMessage}". As the Deepseek r1 model, I would analyze this input and provide a thoughtful and helpful response.`;
        }
    }
}

