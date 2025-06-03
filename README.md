# Lotus T1 Chat

![Lotus T1 Icon](https://raw.githubusercontent.com/dokyit/lotus-t1-chat/main/icon.png)

Lotus T1 Chat is a modern, multi-provider AI chat extension for Visual Studio Code. It supports Deepseek r1, Ollama (local), OpenRouter, and more, with a beautiful chat UI and workspace-specific MCP server management.

## Features

- Chat with Deepseek r1, Ollama, OpenRouter, or simulated models
- Switch providers and models on the fly
- Configure API keys and endpoints easily
- Manage custom MCP servers with a dedicated UI panel
- Modern, dark/light theme-aware chat interface
- Concise, context-aware AI answers

## Requirements

- VS Code 1.100.0 or later
- For Ollama: [Ollama](https://ollama.com/) running locally
- For Deepseek/OpenRouter: API keys from their respective sites
- (Optional) MCP servers for advanced workflows

## Extension Settings

- `lotusT1Chat.modelProvider`: Select the AI provider (ollama, openRouter, deepseek, simulation)
- `lotusT1Chat.ollamaUrl`: URL for local Ollama API
- `lotusT1Chat.ollamaModel`: Default Ollama model
- `lotusT1Chat.openRouterApiKey`: OpenRouter API key
- `lotusT1Chat.openRouterModel`: Default OpenRouter model
- `lotusT1Chat.apiKey`: Deepseek API key
- `lotusT1Chat.simulationModel`: Model to simulate in simulation mode

## Usage

1. Open the command palette and run `Open Lotus T1 Chat`.
2. Select your provider and model from the dropdown.
3. Configure API keys as needed using the "Configure API Key" button.
4. Manage MCP servers with the "MCP Servers" button for advanced workflows.
5. Start chatting!

## Known Issues

- MCP server management is workspace-specific and requires a folder to be open.
- Some advanced features may require additional configuration.

## Release Notes

### 0.0.1
- Initial release with Deepseek, Ollama, OpenRouter, simulation, and MCP management.

---

**Enjoy Lotus T1 Chat!**
