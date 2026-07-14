import * as vscode from 'vscode';
import type { ExtToWeb, WebToExt } from '../types';
import { buildHtml } from './html';
import { ViewedStore } from '../state/viewedStore';

export class DiffPanel {
  private static _instance: DiffPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  private _ready = false;
  private _pendingMessages: ExtToWeb[] = [];
  private _onRefresh?: () => void;
  private _scope?: { repoRoot: string; baseRef: string };

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly _extensionUri: vscode.Uri,
    private readonly _viewedStore: ViewedStore,
  ) {
    this._panel = panel;
    this._panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(_extensionUri, 'dist'),
      ],
    };
    this._panel.webview.html = buildHtml(this._panel.webview, _extensionUri);

    this._panel.webview.onDidReceiveMessage(
      (msg: WebToExt) => this._handleMessage(msg),
      undefined,
      this._disposables,
    );

    this._panel.onDidDispose(() => this.dispose(), undefined, this._disposables);
  }

  static createOrShow(
    extensionUri: vscode.Uri,
    viewedStore: ViewedStore,
  ): DiffPanel {
    if (DiffPanel._instance) {
      DiffPanel._instance._panel.reveal(vscode.ViewColumn.One);
      return DiffPanel._instance;
    }
    const panel = vscode.window.createWebviewPanel(
      'branchDiffView',
      'Branch Diff',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist')],
        retainContextWhenHidden: true,
      },
    );
    DiffPanel._instance = new DiffPanel(panel, extensionUri, viewedStore);
    return DiffPanel._instance;
  }

  /** Re-attach to a panel restored by VS Code after a window reload. */
  static revive(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    viewedStore: ViewedStore,
  ): DiffPanel {
    DiffPanel._instance?.dispose();
    DiffPanel._instance = new DiffPanel(panel, extensionUri, viewedStore);
    return DiffPanel._instance;
  }

  /** Register a callback invoked when the user hits Refresh in the webview. */
  onRefresh(cb: () => void): void {
    this._onRefresh = cb;
  }

  /** Scope under which viewed-state keys are stored (must match what init sends). */
  setScope(repoRoot: string, baseRef: string): void {
    this._scope = { repoRoot, baseRef };
  }

  postMessage(msg: ExtToWeb): void {
    if (!this._ready) {
      this._pendingMessages.push(msg);
      return;
    }
    this._panel.webview.postMessage(msg);
  }

  private _flush(): void {
    for (const m of this._pendingMessages) {
      this._panel.webview.postMessage(m);
    }
    this._pendingMessages = [];
  }

  private _handleMessage(msg: WebToExt): void {
    switch (msg.type) {
      case 'ready':
        this._ready = true;
        this._flush();
        break;
      case 'refresh':
        this._onRefresh?.();
        break;
      case 'setViewed': {
        if (!this._scope) break;
        const { repoRoot, baseRef } = this._scope;
        this._viewedStore.set(
          this._viewedStore.makeKey(repoRoot, baseRef, msg.path),
          msg.value,
        );
        this._panel.webview.postMessage({
          type: 'viewedUpdate',
          viewed: this._viewedStore.getForScope(repoRoot, baseRef),
        });
        break;
      }
    }
  }

  dispose(): void {
    DiffPanel._instance = undefined;
    this._panel.dispose();
    for (const d of this._disposables) {
      d.dispose();
    }
    this._disposables = [];
  }
}
