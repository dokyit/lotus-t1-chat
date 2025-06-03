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
exports.activate = activate;
exports.deactivate = deactivate;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = __importStar(require("vscode"));
const chatPanel_1 = require("./chatPanel");
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "lotus-t1-chat" is now active!');
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    const helloWorldCommand = vscode.commands.registerCommand('lotus-t1-chat.helloWorld', () => {
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        vscode.window.showInformationMessage('Hello World from Lotus T1 Chat!');
    });
    // Register the command to open the chat panel
    const openChatCommand = vscode.commands.registerCommand('lotus-t1-chat.openChat', () => {
        chatPanel_1.ChatPanel.createOrShow(context.extensionUri, context);
    });
    // Register a command to configure the API key
    const configureApiKeyCommand = vscode.commands.registerCommand('lotus-t1-chat.configureApiKey', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'lotusT1Chat.apiKey');
    });
    // Listen for configuration changes for API key
    const configListener = vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('lotusT1Chat.apiKey')) {
            // Notify the user that the API key has been updated
            vscode.window.showInformationMessage('Lotus T1 Chat: API key has been updated');
        }
    });
    // Add all commands and listeners to subscriptions to ensure proper cleanup
    context.subscriptions.push(helloWorldCommand, openChatCommand, configureApiKeyCommand, configListener);
}
// This method is called when your extension is deactivated
function deactivate() { }
//# sourceMappingURL=extension.js.map