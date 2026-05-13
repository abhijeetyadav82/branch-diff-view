import * as vscode from 'vscode';
import type { ExtToWeb, WebToExt } from '../types';
import { buildHtml } from './html';
import { ViewedStore } from '../state/viewedStore';

export class DiffPanel {
  private static _instance: DiffPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  private constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _viewedStore: ViewedStore,
  ) {
    this._panel = vscode.window.createWebviewPanel(
      'branchDiffView',
      'Branch Diff',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(_extensionUri, 'dist'),
        ],
        retainContextWhenHidden: true,
      },
    );

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
    DiffPanel._instance = new DiffPanel(extensionUri, viewedStore);
    return DiffPanel._instance;
  }

  postMessage(msg: ExtToWeb): void {
    this._panel.webview.postMessage(msg);
  }

  private _handleMessage(msg: WebToExt): void {
    switch (msg.type) {
      case 'setViewed':
        this._viewedStore.set(msg.path, msg.value);
        this.postMessage({
          type: 'viewedUpdate',
          viewed: this._viewedStore.getAll(),
        });
        break;
      case 'ready':
        // webview signals it loaded — nothing to do yet
        break;
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
