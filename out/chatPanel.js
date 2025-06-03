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
exports.ChatPanel = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const modelProvider_1 = require("./services/modelProvider");
/**
 * Manages Lotus T1 Chat webview panel
 */
class ChatPanel {
    static currentPanel;
    static viewType = 'lotusT1Chat';
    _panel;
    _extensionUri;
    _disposables = [];
    _modelProvider;
    _chatHistory = [];
    _isInitialized = false;
    // To fix the TypeScript error, ensure that _modelProvider is definitely assigned.
    // Since it's set by async initialization, this is a known limitation.
    // The code has checks to handle the case where it's undefined.
    static createOrShow(extensionUri, context) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        // If we already have a panel, show it
        if (ChatPanel.currentPanel) {
            ChatPanel.currentPanel._panel.reveal(column);
            return;
        }
        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(ChatPanel.viewType, 'Lotus T1 Chat', column || vscode.ViewColumn.One, {
            // Enable JavaScript in the webview
            enableScripts: true,
            // Restrict the webview to only load resources from the extension
            localResourceRoots: [
                vscode.Uri.joinPath(extensionUri, 'out'),
                vscode.Uri.joinPath(extensionUri, 'src', 'webview'),
            ],
            // Retain context when hidden
            retainContextWhenHidden: true
        });
        ChatPanel.currentPanel = new ChatPanel(panel, extensionUri, context);
    }
    constructor(panel, extensionUri, context) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        // Initialize chat history with welcome message
        this._chatHistory = [
            {
                role: 'assistant',
                content: 'Welcome to Lotus T1 Chat! How can I help you today?'
            }
        ];
        // Initialize the model provider asynchronously
        this.initializeModelProvider(context);
        // Set the webview's initial html content
        this._update();
        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        // Update the content based on view changes
        this._panel.onDidChangeViewState(e => {
            if (this._panel.visible) {
                this._update();
            }
        }, null, this._disposables);
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'sendMessage':
                    this._handleUserMessage(message.text);
                    return;
                case 'requestChatHistory':
                    this._panel.webview.postMessage({
                        command: 'loadChatHistory',
                        history: this._chatHistory
                    });
                    return;
                case 'setModelProvider':
                    // Update VS Code configuration for model provider
                    await vscode.workspace.getConfiguration().update('lotusT1Chat.modelProvider', message.provider, vscode.ConfigurationTarget.Global);
                    // Optionally reset chat history (uncomment if desired)
                    // this._chatHistory = [
                    //     {
                    //         role: 'assistant',
                    //         content: 'Switched to ' + message.provider + '. How can I help you?'
                    //     }
                    // ];
                    // Re-initialize the model provider
                    await this.initializeModelProvider(context);
                    // Optionally update the UI (reload chat history)
                    this._panel.webview.postMessage({
                        command: 'loadChatHistory',
                        history: this._chatHistory
                    });
                    return;
                case 'configureApiKey':
                    // Open the correct settings page for the selected provider
                    let settingId = '';
                    switch (message.provider) {
                        case 'ollama':
                            settingId = 'lotusT1Chat.ollamaBaseUrl';
                            break;
                        case 'openRouter':
                            settingId = 'lotusT1Chat.openRouterApiKey';
                            break;
                        case 'deepseek':
                            settingId = 'lotusT1Chat.deepseekApiKey';
                            break;
                        case 'simulation':
                            // No API key needed for simulation
                            vscode.window.showInformationMessage('No API key required for Simulation provider.');
                            return;
                        case 'mcp':
                            settingId = 'lotusT1Chat.mcpEndpoint';
                            break;
                    }
                    if (settingId) {
                        vscode.commands.executeCommand('workbench.action.openSettings', settingId);
                    }
                    return;
                case 'getAvailableModels': {
                    // Dynamically get available models for the selected provider
                    const providerName = message.provider;
                    let provider;
                    try {
                        // Re-create provider for the requested type
                        const config = vscode.workspace.getConfiguration('lotusT1Chat');
                        await config.update('modelProvider', providerName, vscode.ConfigurationTarget.Global);
                        provider = await (await import('./services/modelProvider.js')).ModelProviderFactory.createProvider(context);
                        await provider.initialize(context);
                        const models = await provider.getAvailableModels();
                        this._panel.webview.postMessage({ command: 'availableModels', models });
                    }
                    catch (err) {
                        this._panel.webview.postMessage({ command: 'availableModels', models: [] });
                    }
                    return;
                }
                case 'setModel': {
                    // Set the selected model for the current provider
                    if (this._modelProvider && typeof this._modelProvider.setModel === 'function') {
                        await this._modelProvider.setModel(message.modelId);
                        // Optionally, reload chat history or update UI
                    }
                    return;
                }
                case 'configureMcpServers': {
                    // Show a custom MCP server management webview panel
                    const panel = vscode.window.createWebviewPanel('lotusT1McpServers', 'Lotus MCP Servers', vscode.ViewColumn.Active, { enableScripts: true });
                    panel.webview.html = `
                            <!DOCTYPE html>
                            <html lang="en">
                            <head>
                                <meta charset="UTF-8">
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                <title>MCP Server Management</title>
                                <style>
                                    body { font-family: var(--vscode-font-family, sans-serif); background: var(--vscode-editor-background, #222); color: var(--vscode-editor-foreground, #fff); margin: 0; padding: 0; }
                                    .container { padding: 24px; max-width: 600px; margin: 0 auto; }
                                    h2 { margin-top: 0; }
                                    textarea { width: 100%; min-height: 200px; font-family: monospace; font-size: 1em; background: var(--vscode-input-background, #222); color: var(--vscode-input-foreground, #fff); border: 1px solid var(--vscode-input-border, #444); border-radius: 4px; padding: 8px; }
                                    button { margin-top: 12px; padding: 6px 16px; font-size: 1em; border-radius: 4px; border: none; background: var(--vscode-button-background, #007acc); color: var(--vscode-button-foreground, #fff); cursor: pointer; }
                                </style>
                            </head>
                            <body>
                                <div class="container">
                                    <h2>Lotus MCP Server Management</h2>
                                    <p>Edit your <b>lotus_mcp_settings.json</b> below. This file should be in your workspace root.</p>
                                    <textarea id="mcp-settings"></textarea>
                                    <br>
                                    <button id="save-btn">Save</button>
                                    <span id="status" style="margin-left:12px;"></span>
                                </div>
                                <script>
                                    const vscode = acquireVsCodeApi();
                                    window.addEventListener('message', event => {
                                        if (event.data.command === 'loadMcpSettings') {
                                            document.getElementById('mcp-settings').value = event.data.text;
                                        } else if (event.data.command === 'saveStatus') {
                                            document.getElementById('status').textContent = event.data.text;
                                            setTimeout(() => { document.getElementById('status').textContent = ''; }, 2000);
                                        }
                                    });
                                    document.getElementById('save-btn').onclick = () => {
                                        vscode.postMessage({ command: 'saveMcpSettings', text: document.getElementById('mcp-settings').value });
                                    };
                                    vscode.postMessage({ command: 'requestMcpSettings' });
                                </script>
                            </body>
                            </html>
                        `;
                    // Handle messages from the MCP panel
                    panel.webview.onDidReceiveMessage(async (msg) => {
                        const wsFolders = vscode.workspace.workspaceFolders;
                        if (msg.command === 'requestMcpSettings') {
                            if (!wsFolders || wsFolders.length === 0) {
                                panel.webview.postMessage({ command: 'saveStatus', text: 'No workspace open.' });
                                return;
                            }
                            const lotusMcpSettingsPath = vscode.Uri.joinPath(wsFolders[0].uri, 'lotus_mcp_settings.json');
                            try {
                                const doc = await vscode.workspace.openTextDocument(lotusMcpSettingsPath);
                                panel.webview.postMessage({ command: 'loadMcpSettings', text: doc.getText() });
                            }
                            catch {
                                panel.webview.postMessage({ command: 'loadMcpSettings', text: '{\n  "mcpServers": {}\n}' });
                            }
                        }
                        else if (msg.command === 'saveMcpSettings') {
                            if (!wsFolders || wsFolders.length === 0) {
                                panel.webview.postMessage({ command: 'saveStatus', text: 'No workspace open.' });
                                return;
                            }
                            const lotusMcpSettingsPath = vscode.Uri.joinPath(wsFolders[0].uri, 'lotus_mcp_settings.json');
                            try {
                                const edit = new vscode.WorkspaceEdit();
                                edit.createFile(lotusMcpSettingsPath, { ignoreIfExists: true });
                                await vscode.workspace.applyEdit(edit);
                                await vscode.workspace.fs.writeFile(lotusMcpSettingsPath, Buffer.from(msg.text, 'utf8'));
                                panel.webview.postMessage({ command: 'saveStatus', text: 'Saved!' });
                            }
                            catch (e) {
                                panel.webview.postMessage({ command: 'saveStatus', text: 'Failed to save.' });
                            }
                        }
                    });
                    return;
                }
            }
        }, null, this._disposables);
        // Model provider will be initialized asynchronously
        // We'll check configuration after initialization
    }
    dispose() {
        ChatPanel.currentPanel = undefined;
        // Clean up our resources
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
    _update() {
        const webview = this._panel.webview;
        this._panel.title = "Lotus T1 Chat";
        this._panel.webview.html = this._getHtmlForWebview(webview);
        // After updating the HTML, send the chat history to the webview
        setTimeout(() => {
            this._panel.webview.postMessage({
                command: 'loadChatHistory',
                history: this._chatHistory
            });
        }, 500);
    }
    _getHtmlForWebview(webview) {
        // Get the local path to the HTML file
        const htmlFile = vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'chatView.html');
        let htmlContent;
        try {
            // Read the HTML file
            htmlContent = fs.readFileSync(htmlFile.fsPath, 'utf8');
        }
        catch (error) {
            // If the file doesn't exist (during development), return a basic HTML
            htmlContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Lotus T1 Chat</title>
                <style>
                    body {
                        display: flex;
                        flex-direction: column;
                        height: 100vh;
                        margin: 0;
                        padding: 0;
                        color: var(--vscode-editor-foreground);
                        font-family: var(--vscode-font-family);
                        background-color: var(--vscode-editor-background);
                    }
                    #chat-container {
                        display: flex;
                        flex-direction: column;
                        height: 100%;
                        overflow: hidden;
                    }
                    #message-container {
                        flex: 1;
                        overflow-y: auto;
                        padding: 10px;
                    }
                    .message {
                        margin-bottom: 10px;
                        padding: 8px 12px;
                        border-radius: 6px;
                        max-width: 80%;
                    }
                    .user-message {
                        align-self: flex-end;
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        margin-left: auto;
                    }
                    .bot-message {
                        background-color: var(--vscode-editor-inactiveSelectionBackground);
                        color: var(--vscode-editor-foreground);
                    }
                    .error-message {
                        background-color: var(--vscode-errorForeground);
                        color: var(--vscode-editor-background);
                    }
                    .loading {
                        display: flex;
                        align-items: center;
                        margin-bottom: 10px;
                    }
                    .loading-dots {
                        display: flex;
                    }
                    .loading-dots span {
                        width: 8px;
                        height: 8px;
                        margin: 0 4px;
                        background-color: var(--vscode-editor-foreground);
                        border-radius: 50%;
                        opacity: 0.4;
                        animation: loadingDots 1.4s infinite ease-in-out both;
                    }
                    .loading-dots span:nth-child(1) {
                        animation-delay: 0s;
                    }
                    .loading-dots span:nth-child(2) {
                        animation-delay: 0.2s;
                    }
                    .loading-dots span:nth-child(3) {
                        animation-delay: 0.4s;
                    }
                    @keyframes loadingDots {
                        0%, 80%, 100% {
                            opacity: 0.4;
                        }
                        40% {
                            opacity: 1;
                        }
                    }
                    .api-warning {
                        background-color: var(--vscode-editorWarning-foreground);
                        color: var(--vscode-editor-background);
                        padding: 10px;
                        margin-bottom: 10px;
                        border-radius: 4px;
                        text-align: center;
                    }
                    .api-warning button {
                        margin-top: 8px;
                        padding: 4px 8px;
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    }
                    #input-container {
                        display: flex;
                        padding: 10px;
                        background-color: var(--vscode-editor-background);
                        border-top: 1px solid var(--vscode-panel-border);
                    }
                    #message-input {
                        flex: 1;
                        padding: 8px;
                        border: 1px solid var(--vscode-input-border);
                        background-color: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border-radius: 4px;
                    }
                    #send-button {
                        margin-left: 8px;
                        padding: 8px 16px;
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    }
                    #send-button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    #send-button:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }
                </style>
            </head>
            <body>
                <div id="chat-container">
                    <div id="message-container"></div>
                    <div id="input-container">
                        <input type="text" id="message-input" placeholder="Type your message here...">
                        <button id="send-button">Send</button>
                    </div>
                </div>

                <script>
                    (function() {
                        const vscode = acquireVsCodeApi();
                        const messageContainer = document.getElementById('message-container');
                        const messageInput = document.getElementById('message-input');
                        const sendButton = document.getElementById('send-button');
                        let isWaitingForResponse = false;
                        
                        // Initialize state
                        const state = vscode.getState() || { messages: [] };
                        
                        // Send message function
                        function sendMessage() {
                            if (isWaitingForResponse) {
                                return;
                            }
                            
                            const text = messageInput.value.trim();
                            if (text) {
                                // Add user message to UI
                                addMessage(text, 'user');
                                
                                // Send message to extension
                                vscode.postMessage({
                                    command: 'sendMessage',
                                    text: text
                                });
                                
                                // Clear input and show loading indicator
                                messageInput.value = '';
                                isWaitingForResponse = true;
                                sendButton.disabled = true;
                                messageInput.disabled = true;
                                
                                // Add loading indicator
                                const loadingDiv = document.createElement('div');
                                loadingDiv.className = 'loading';
                                loadingDiv.id = 'loading-indicator';
                                
                                const dotsDiv = document.createElement('div');
                                dotsDiv.className = 'loading-dots';
                                
                                for (let i = 0; i < 3; i++) {
                                    const dot = document.createElement('span');
                                    dotsDiv.appendChild(dot);
                                }
                                
                                loadingDiv.appendChild(dotsDiv);
                                messageContainer.appendChild(loadingDiv);
                                messageContainer.scrollTop = messageContainer.scrollHeight;
                            }
                        }

                        // Add message to chat UI
                        function addMessage(text, sender, isError = false) {
                            const messageDiv = document.createElement('div');
                            messageDiv.className = isError 
                                ? 'message error-message' 
                                : \`message \${sender}-message\`;
                            messageDiv.textContent = text;
                            messageContainer.appendChild(messageDiv);
                            
                            // Save to state
                            state.messages.push({
                                text,
                                sender,
                                isError
                            });
                            vscode.setState(state);
                            
                            // Scroll to bottom
                            messageContainer.scrollTop = messageContainer.scrollHeight;
                        }

                        // Load chat history
                        function loadChatHistory(history) {
                            // Clear existing messages
                            messageContainer.innerHTML = '';
                            
                            // Add each message from history
                            history.forEach(message => {
                                addMessage(
                                    message.content, 
                                    message.role === 'user' ? 'user' : 'bot'
                                );
                            });
                        }
                        
                        // Show API key warning
                        function showApiKeyWarning() {
                            const warningDiv = document.createElement('div');
                            warningDiv.className = 'api-warning';
                            warningDiv.innerHTML = 'Deepseek API key is not configured. Please set your API key in the extension settings.';
                            
                            const configButton = document.createElement('button');
                            configButton.textContent = 'Configure API Key';
                            configButton.onclick = () => {
                                vscode.postMessage({
                                    command: 'configureApiKey'
                                });
                            };
                            
                            warningDiv.appendChild(document.createElement('br'));
                            warningDiv.appendChild(configButton);
                            
                            messageContainer.insertBefore(warningDiv, messageContainer.firstChild);
                        }

                        // Event listeners
                        sendButton.addEventListener('click', sendMessage);
                        messageInput.addEventListener('keypress', (e) => {
                            if (e.key === 'Enter') {
                                sendMessage();
                            }
                        });

                        // Handle messages from the extension
                        window.addEventListener('message', event => {
                            const message = event.data;
                            
                            switch (message.command) {
                                case 'botResponse':
                                    // Remove loading indicator
                                    const loadingIndicator = document.getElementById('loading-indicator');
                                    if (loadingIndicator) {
                                        loadingIndicator.remove();
                                    }
                                    
                                    // Add response
                                    addMessage(message.text, 'bot');
                                    
                                    // Re-enable input
                                    isWaitingForResponse = false;
                                    sendButton.disabled = false;
                                    messageInput.disabled = false;
                                    messageInput.focus();
                                    break;
                                    
                                case 'loadChatHistory':
                                    loadChatHistory(message.history);
                                    break;
                                    
                                case 'showApiKeyWarning':
                                    showApiKeyWarning();
                                    break;
                                    
                                case 'error':
                                    // Remove loading indicator
                                    const errorLoadingIndicator = document.getElementById('loading-indicator');
                                    if (errorLoadingIndicator) {
                                        errorLoadingIndicator.remove();
                                    }
                                    
                                    // Add error message
                                    addMessage(message.text, 'bot', true);
                                    
                                    // Re-enable input
                                    isWaitingForResponse = false;
                                    sendButton.disabled = false;
                                    messageInput.disabled = false;
                                    break;
                            }
                        });
                        
                        // Request chat history on load
                        vscode.postMessage({
                            command: 'requestChatHistory'
                        });
                    }());
                </script>
            </body>
            </html>
            `;
        }
        return htmlContent;
    }
    /**
     * Initialize the model provider based on user configuration
     */
    async initializeModelProvider(context) {
        try {
            const provider = await modelProvider_1.ModelProviderFactory.createProvider(context);
            await provider.initialize(context); // Initialize the local instance first
            // If initialization is successful, assign to the class member
            this._modelProvider = provider;
            this._isInitialized = true;
            // Now, this._modelProvider is guaranteed to be defined and initialized.
            // Check if provider is configured
            if (!this._modelProvider.isConfigured()) {
                this._panel.webview.postMessage({
                    command: 'showApiKeyWarning'
                });
            }
            // Get the currently selected model and show in UI
            const model = await this._modelProvider.getSelectedModel();
            this._panel.webview.postMessage({
                command: 'updateModelInfo',
                provider: this._modelProvider.name, // Safe to access .name
                model: model.name
            });
        }
        catch (error) {
            console.error('Error initializing model provider:', error);
            this._panel.webview.postMessage({
                command: 'error',
                text: error instanceof Error ? error.message : 'Failed to initialize model provider'
            });
            // Ensure consistent state on failure
            this._isInitialized = false;
            this._modelProvider = undefined;
        }
    }
    async _handleUserMessage(text) {
        // Add user message to chat history
        this._chatHistory.push({
            role: 'user',
            content: text
        });
        try {
            // Wait for initialization if needed
            if (!this._isInitialized) {
                await new Promise(resolve => {
                    const checkInitialized = () => {
                        if (this._isInitialized) {
                            resolve(undefined);
                        }
                        else {
                            setTimeout(checkInitialized, 100);
                        }
                    };
                    checkInitialized();
                });
            }
            // After waiting for _isInitialized, explicitly check if _modelProvider is defined.
            // This is the primary guard against 'undefined' errors for _modelProvider.
            if (!this._modelProvider) {
                this._panel.webview.postMessage({
                    command: 'error',
                    text: 'Model provider is not available. Initialization may have failed. Please check settings or reload the window.'
                });
                return;
            }
            // Check if provider is configured
            if (!this._modelProvider.isConfigured()) { // Now safe, as _modelProvider is confirmed to be defined.
                const configurePressed = await this._modelProvider.promptForConfiguration();
                if (configurePressed) {
                    this._panel.webview.postMessage({
                        command: 'error',
                        text: 'Please configure the model provider in settings and try again.'
                    });
                }
                else {
                    this._panel.webview.postMessage({
                        command: 'error',
                        text: 'Provider configuration is required to use the chat functionality.'
                    });
                }
                return;
            }
            // Send message to the model provider
            // The non-null assertion operator (!) is now safer due to the explicit check above.
            const response = await this._modelProvider.sendMessage(this._chatHistory);
            // Add response to chat history
            this._chatHistory.push({
                role: 'assistant',
                content: response
            });
            // Send response back to webview
            this._panel.webview.postMessage({
                command: 'botResponse',
                text: response
            });
        }
        catch (error) {
            console.error('Error calling model provider:', error);
            // Send error message to webview
            this._panel.webview.postMessage({
                command: 'error',
                text: error instanceof Error ? error.message : 'An unknown error occurred'
            });
        }
    }
}
exports.ChatPanel = ChatPanel;
//# sourceMappingURL=chatPanel.js.map