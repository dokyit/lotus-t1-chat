// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ChatPanel } from './chatPanel';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

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
		ChatPanel.createOrShow(context.extensionUri, context);
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
	context.subscriptions.push(
		helloWorldCommand,
		openChatCommand,
		configureApiKeyCommand,
		configListener
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
