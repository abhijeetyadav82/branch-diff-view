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
    <div class="tb-group tb-left">
      <span class="base-chip" title="Base branch">
        <span class="base-icon">⎇</span>
        <span class="base-label">—</span>
      </span>
      <span class="summary-chip" id="summary-chip" hidden>
        <span class="sum-files">0 files</span>
        <span class="sum-sep">·</span>
        <span class="adds" id="sum-adds">+0</span>
        <span class="dels" id="sum-dels">-0</span>
      </span>
    </div>
    <div class="tb-group tb-center">
      <input id="filter" type="search" placeholder="Filter files…" spellcheck="false" />
    </div>
    <div class="tb-group tb-right">
      <div class="seg">
        <button id="btn-split" class="active" title="Side-by-side diff">Split</button>
        <button id="btn-unified" title="Unified diff">Unified</button>
      </div>
      <div class="seg">
        <button id="btn-expand" title="Expand all files">Expand</button>
        <button id="btn-collapse" title="Collapse all files">Collapse</button>
      </div>
      <button id="btn-refresh" class="icon-btn" title="Refresh diff (re-run git)">↻</button>
    </div>
  </div>
  <div id="main">
    <aside id="rail">
      <div class="rail-header">
        <span class="rail-title">Changed files</span>
        <span class="rail-count" id="rail-count">0</span>
      </div>
      <div id="rail-tree"></div>
    </aside>
    <div id="pane"></div>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
