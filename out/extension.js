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
const vscode = __importStar(require("vscode"));
function activate(context) {
    console.log('Markdown Preview Plus is now active!');
    // Register preview command
    const previewCommand = vscode.commands.registerCommand('markdown-preview-plus.showPreview', () => {
        MarkdownPreviewPanel.createOrShow(context.extensionUri);
    });
    // Register help command
    const helpCommand = vscode.commands.registerCommand('markdown-preview-plus.showHelp', () => {
        MarkdownHelpPanel.createOrShow(context.extensionUri);
    });
    context.subscriptions.push(previewCommand, helpCommand);
}
class MarkdownPreviewPanel {
    static createOrShow(extensionUri) {
        const column = vscode.window.activeTextEditor?.viewColumn;
        if (MarkdownPreviewPanel.currentPanel) {
            MarkdownPreviewPanel.currentPanel._panel.reveal(column);
            return;
        }
        const panel = vscode.window.createWebviewPanel('markdownPreview', 'Markdown Preview', column || vscode.ViewColumn.Two, {
            enableScripts: true,
            localResourceRoots: [extensionUri]
        });
        MarkdownPreviewPanel.currentPanel = new MarkdownPreviewPanel(panel, extensionUri);
    }
    constructor(panel, extensionUri) {
        this._disposables = [];
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._update();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.onDidChangeViewState(e => {
            if (this._panel.visible) {
                this._update();
            }
        }, null, this._disposables);
        vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document === vscode.window.activeTextEditor?.document) {
                this._update();
            }
        }, null, this._disposables);
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'showHelp':
                    vscode.commands.executeCommand('markdown-preview-plus.showHelp');
                    return;
            }
        }, null, this._disposables);
    }
    dispose() {
        MarkdownPreviewPanel.currentPanel = undefined;
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
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }
    _getHtmlForWebview(webview) {
        const editor = vscode.window.activeTextEditor;
        let markdownContent = '';
        if (editor && editor.document.languageId === 'markdown') {
            markdownContent = editor.document.getText();
        }
        const htmlContent = this._convertMarkdownToHtml(markdownContent);
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Markdown Preview</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                        line-height: 1.6;
                        padding: 20px;
                        max-width: 800px;
                        margin: 0 auto;
                        background-color: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                    }
                    h1, h2, h3, h4, h5, h6 {
                        margin-top: 1.5em;
                        margin-bottom: 0.5em;
                        color: var(--vscode-textLink-foreground);
                    }
                    h1 { border-bottom: 2px solid var(--vscode-input-border); padding-bottom: 0.3em; }
                    h2 { border-bottom: 1px solid var(--vscode-input-border); padding-bottom: 0.3em; }
                    code {
                        background-color: var(--vscode-textCodeBlock-background);
                        padding: 2px 6px;
                        border-radius: 3px;
                        font-family: 'Courier New', monospace;
                    }
                    pre {
                        background-color: var(--vscode-textCodeBlock-background);
                        padding: 1em;
                        border-radius: 5px;
                        overflow-x: auto;
                        border-left: 4px solid var(--vscode-inputValidation-infoBorder);
                    }
                    pre code {
                        background: none;
                        padding: 0;
                    }
                    blockquote {
                        border-left: 4px solid var(--vscode-inputValidation-infoBorder);
                        margin: 1em 0;
                        padding-left: 1em;
                        color: var(--vscode-input-placeholderForeground);
                        background-color: var(--vscode-input-background);
                    }
                    table {
                        border-collapse: collapse;
                        width: 100%;
                        margin: 1em 0;
                    }
                    th, td {
                        border: 1px solid var(--vscode-input-border);
                        padding: 8px 12px;
                        text-align: left;
                    }
                    th {
                        background-color: var(--vscode-input-background);
                        font-weight: bold;
                    }
                    a {
                        color: var(--vscode-textLink-foreground);
                        text-decoration: none;
                    }
                    a:hover {
                        text-decoration: underline;
                    }
                    ul, ol {
                        padding-left: 2em;
                    }
                    li {
                        margin: 0.5em 0;
                    }
                    hr {
                        border: none;
                        border-top: 2px solid var(--vscode-input-border);
                        margin: 2em 0;
                    }
                    .help-button {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        padding: 10px 15px;
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 14px;
                    }
                    .help-button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    .timestamp {
                        position: fixed;
                        bottom: 20px;
                        right: 20px;
                        color: var(--vscode-input-placeholderForeground);
                        font-size: 12px;
                    }
                    .empty-state {
                        text-align: center;
                        padding: 40px;
                        color: var(--vscode-input-placeholderForeground);
                    }
                </style>
            </head>
            <body>
                <button class="help-button" onclick="showHelp()">📚 Markdown Help</button>
                
                <div id="content">
                    ${htmlContent || '<div class="empty-state"><h3>No Markdown Content</h3><p>Open a Markdown file to see the preview</p></div>'}
                </div>

                <div class="timestamp">Last updated: ${new Date().toLocaleTimeString()}</div>

                <script>
                    const vscode = acquireVsCodeApi();
                    
                    function showHelp() {
                        vscode.postMessage({
                            command: 'showHelp'
                        });
                    }
                </script>
            </body>
            </html>
        `;
    }
    _convertMarkdownToHtml(text) {
        if (!text) {
            return '';
        }
        return text
            // Headers
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
            .replace(/^##### (.*$)/gim, '<h5>$1</h5>')
            .replace(/^###### (.*$)/gim, '<h6>$1</h6>')
            // Bold
            .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
            .replace(/__(.*?)__/gim, '<strong>$1</strong>')
            // Italic
            .replace(/\*(.*?)\*/gim, '<em>$1</em>')
            .replace(/_(.*?)_/gim, '<em>$1</em>')
            // Strikethrough
            .replace(/~~(.*?)~~/gim, '<s>$1</s>')
            // Inline code
            .replace(/`(.*?)`/gim, '<code>$1</code>')
            // Code blocks
            .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
            // Links
            .replace(/\[([^\[]+)\]\(([^\)]+)\)/gim, '<a href="$2">$1</a>')
            // Images
            .replace(/!\[([^\[]+)\]\(([^\)]+)\)/gim, '<img src="$2" alt="$1" />')
            // Blockquotes
            .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
            // Horizontal rules
            .replace(/^\s*---\s*$/gim, '<hr>')
            .replace(/^\s*\*\*\*\s*$/gim, '<hr>')
            .replace(/^\s*___\s*$/gim, '<hr>')
            // Unordered lists
            .replace(/^\s*[-*+] (.*$)/gim, '<ul><li>$1</li></ul>')
            // Ordered lists
            .replace(/^\s*\d+\. (.*$)/gim, '<ol><li>$1</li></ol>')
            // Paragraphs and line breaks
            .replace(/\n\n+/g, '</p><p>')
            .replace(/\n/g, '<br>')
            // Wrap in paragraph if needed
            .replace(/^([^<].*[^>])$/gim, '<p>$1</p>');
    }
}
class MarkdownHelpPanel {
    static createOrShow(extensionUri) {
        const column = vscode.window.activeTextEditor?.viewColumn || vscode.ViewColumn.Beside;
        if (MarkdownHelpPanel.currentPanel) {
            MarkdownHelpPanel.currentPanel._panel.reveal(column);
            return;
        }
        const panel = vscode.window.createWebviewPanel('markdownHelp', 'Markdown Help', column, {
            enableScripts: true,
            localResourceRoots: [extensionUri]
        });
        MarkdownHelpPanel.currentPanel = new MarkdownHelpPanel(panel, extensionUri);
    }
    constructor(panel, extensionUri) {
        this._disposables = [];
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._update();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }
    dispose() {
        MarkdownHelpPanel.currentPanel = undefined;
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
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }
    _getHtmlForWebview(webview) {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Markdown Help</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                        line-height: 1.6;
                        padding: 20px;
                        max-width: 900px;
                        margin: 0 auto;
                        background-color: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                    }
                    h1, h2, h3 {
                        color: var(--vscode-textLink-foreground);
                        margin-top: 1.5em;
                    }
                    h1 {
                        border-bottom: 2px solid var(--vscode-input-border);
                        padding-bottom: 0.3em;
                        text-align: center;
                    }
                    h2 {
                        border-bottom: 1px solid var(--vscode-input-border);
                        padding-bottom: 0.3em;
                        margin-top: 2em;
                    }
                    .syntax-example {
                        background-color: var(--vscode-input-background);
                        border: 1px solid var(--vscode-input-border);
                        padding: 15px;
                        margin: 15px 0;
                        border-radius: 5px;
                        font-family: 'Courier New', monospace;
                        white-space: pre-wrap;
                    }
                    .result {
                        background-color: var(--vscode-textCodeBlock-background);
                        padding: 15px;
                        margin: 15px 0;
                        border-radius: 5px;
                        border-left: 4px solid var(--vscode-inputValidation-infoBorder);
                    }
                    code {
                        background-color: var(--vscode-textCodeBlock-background);
                        padding: 2px 6px;
                        border-radius: 3px;
                        font-family: 'Courier New', monospace;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 1em 0;
                    }
                    th, td {
                        border: 1px solid var(--vscode-input-border);
                        padding: 10px;
                        text-align: left;
                    }
                    th {
                        background-color: var(--vscode-input-background);
                        font-weight: bold;
                    }
                    .example-container {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 10px;
                        margin: 15px 0;
                    }
                    @media (max-width: 768px) {
                        .example-container {
                            grid-template-columns: 1fr;
                        }
                    }
                    .back-button {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        padding: 10px 15px;
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        border-radius: 3px;
                        cursor: pointer;
                    }
                    .back-button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    .tip-box {
                        margin-top: 30px;
                        padding: 15px;
                        background-color: var(--vscode-inputValidation-infoBackground);
                        border-left: 4px solid var(--vscode-inputValidation-infoBorder);
                        border-radius: 5px;
                    }
                </style>
            </head>
            <body>
                <button class="back-button" onclick="window.close()">← Close</button>
                
                <h1>📝 Markdown Syntax Guide</h1>
                
                <h2>📋 Headers</h2>
                <div class="example-container">
                    <div class="syntax-example"># H1 Header<br>## H2 Header<br>### H3 Header<br>#### H4 Header</div>
                    <div class="result">
                        <h1>H1 Header</h1>
                        <h2>H2 Header</h2>
                        <h3>H3 Header</h3>
                        <h4>H4 Header</h4>
                    </div>
                </div>

                <h2>🎨 Text Formatting</h2>
                <div class="example-container">
                    <div class="syntax-example">**Bold Text**<br>*Italic Text*<br>~~Strikethrough~~<br>\`Inline Code\`<br>***Bold & Italic***</div>
                    <div class="result">
                        <p><strong>Bold Text</strong><br>
                        <em>Italic Text</em><br>
                        <s>Strikethrough</s><br>
                        <code>Inline Code</code><br>
                        <em><strong>Bold & Italic</strong></em></p>
                    </div>
                </div>

                <h2>📝 Lists</h2>
                <div class="example-container">
                    <div class="syntax-example">- Item 1<br>- Item 2<br>  - Nested Item<br>  - Another Nested</div>
                    <div class="result">
                        <ul>
                            <li>Item 1</li>
                            <li>Item 2
                                <ul>
                                    <li>Nested Item</li>
                                    <li>Another Nested</li>
                                </ul>
                            </li>
                        </ul>
                    </div>
                </div>

                <div class="example-container">
                    <div class="syntax-example">1. First Item<br>2. Second Item<br>3. Third Item</div>
                    <div class="result">
                        <ol>
                            <li>First Item</li>
                            <li>Second Item</li>
                            <li>Third Item</li>
                        </ol>
                    </div>
                </div>

                <h2>🔗 Links & Images</h2>
                <div class="syntax-example">[Google](https://google.com)<br><br>![Alt Text](image.jpg)</div>

                <h2>💻 Code Blocks</h2>
                <div class="syntax-example">\`\`\`javascript<br>function hello() {<br>  console.log("Hello!");<br>}<br>\`\`\`</div>

                <h2>📊 Tables</h2>
                <div class="syntax-example">| Name | Age | City |<br>|------|-----|------|<br>| John | 25  | NYC  |<br>| Jane | 30  | LA   |</div>

                <h2>💬 Blockquotes</h2>
                <div class="syntax-example">> This is a quote<br>> Second line of quote</div>

                <h2>📏 Horizontal Rules</h2>
                <div class="syntax-example">---<br>***<br>___</div>

                <h2>🎯 Quick Reference</h2>
                <table>
                    <tr><th>Element</th><th>Syntax</th></tr>
                    <tr><td>Bold</td><td>**text** or __text__</td></tr>
                    <tr><td>Italic</td><td>*text* or _text_</td></tr>
                    <tr><td>Strikethrough</td><td>~~text~~</td></tr>
                    <tr><td>Inline Code</td><td>\`code\`</td></tr>
                    <tr><td>Link</td><td>[title](https://...)</td></tr>
                    <tr><td>Image</td><td>![alt](image.jpg)</td></tr>
                    <tr><td>Blockquote</td><td>> quote</td></tr>
                </table>

                <div class="tip-box">
                    <strong>💡 Tip:</strong> Use <code>Ctrl+Shift+M</code> for preview and <code>Ctrl+Shift+H</code> for this help panel!
                </div>

                <script>
                    document.addEventListener('keydown', function(e) {
                        if (e.key === 'Escape') {
                            window.close();
                        }
                    });
                </script>
            </body>
            </html>
        `;
    }
}
function deactivate() { }
//# sourceMappingURL=extension.js.map