import * as vscode from 'vscode';
import * as crypto from 'crypto';

export function getNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

export function buildHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
): string {
  const nonce = getNonce();

  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'dist', 'webview.js'),
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'dist', 'webview.css'),
  );

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
             script-src 'nonce-${nonce}';
             style-src ${webview.cspSource} 'unsafe-inline';
             font-src ${webview.cspSource};" />
  <link rel="stylesheet" href="${styleUri}" />
  <title>Branch Diff</title>
</head>
<body>
  <div id="toolbar">
    <span class="base-label">base: —</span>
    <button id="btn-refresh" title="Refresh">↻ Refresh</button>
    <span class="spacer"></span>
    <button id="btn-split" class="active" title="Side-by-side diff">Split</button>
    <button id="btn-unified" title="Unified diff">Unified</button>
    <button id="btn-expand" title="Expand all">⊞ All</button>
    <button id="btn-collapse" title="Collapse all">⊟ All</button>
  </div>
  <div id="main">
    <div id="rail"></div>
    <div id="pane"></div>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
