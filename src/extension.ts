import * as vscode from 'vscode';
import { DiffPanel } from './panel/DiffPanel';
import { GitService } from './git/gitService';
import { ViewedStore } from './state/viewedStore';
import { findRepoRoot } from './git/repoLocator';
import type { FileDiff } from './types';

let _panel: DiffPanel | undefined;
let _lastBase: string | undefined;
let _repoRoot: string | undefined;
let _viewedStore: ViewedStore | undefined;

const LAST_REPO_KEY = 'branchDiff.lastRepoRoot';
const LAST_BASE_KEY = 'branchDiff.lastBase';

export async function activate(ctx: vscode.ExtensionContext): Promise<void> {
  _viewedStore = new ViewedStore(ctx.workspaceState);

  ctx.subscriptions.push(
    vscode.commands.registerCommand('branchDiff.compare', () => compareCommand(ctx)),
    vscode.commands.registerCommand('branchDiff.refresh', () => refreshCommand()),
    vscode.commands.registerCommand('branchDiff.toggleLayout', () =>
      _panel?.postMessage({ type: 'toggleLayout' }),
    ),
    vscode.window.registerWebviewPanelSerializer('branchDiffView', {
      async deserializeWebviewPanel(panel: vscode.WebviewPanel): Promise<void> {
        _panel = DiffPanel.revive(panel, ctx.extensionUri, _viewedStore!);
        _panel.onRefresh(() => refreshCommand());
        _repoRoot = ctx.workspaceState.get<string>(LAST_REPO_KEY);
        _lastBase = ctx.workspaceState.get<string>(LAST_BASE_KEY);
        if (_repoRoot && _lastBase) await refreshCommand();
      },
    }),
  );
}

async function compareCommand(ctx: vscode.ExtensionContext): Promise<void> {
  const root = await findRepoRoot();
  if (!root) {
    vscode.window.showErrorMessage('Branch Diff: no git repository found.');
    return;
  }
  _repoRoot = root;

  const git = new GitService(root);
  const branches = await git.listBranches();

  const defaultBase =
    _lastBase ??
    vscode.workspace.getConfiguration('branchDiff').get<string>('defaultBase') ??
    'develop';

  const picked = await vscode.window.showQuickPick(branches, {
    placeHolder: 'Select base branch…',
    title: 'Branch Diff: Compare with Base',
  });
  if (!picked) return;

  _lastBase = picked;
  await ctx.workspaceState.update(LAST_REPO_KEY, root);
  await ctx.workspaceState.update(LAST_BASE_KEY, picked);

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Branch Diff: loading diff…' },
    async () => {
      const files = await git.buildFileDiffs(picked);
      sendToPanel(ctx, picked, files);
    },
  );
}

async function refreshCommand(): Promise<void> {
  if (!_repoRoot || !_lastBase || !_viewedStore) return;
  const git = new GitService(_repoRoot);
  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Branch Diff: refreshing…' },
    async () => {
      const files = await git.buildFileDiffs(_lastBase!);
      _viewedStore!.prune(_repoRoot!, _lastBase!, new Set(files.map((f) => f.path)));
      _panel?.setScope(_repoRoot!, _lastBase!);
      _panel?.postMessage({
        type: 'init',
        files,
        baseRef: _lastBase!,
        viewed: _viewedStore!.getForScope(_repoRoot!, _lastBase!),
      });
    },
  );
}

function sendToPanel(
  ctx: vscode.ExtensionContext,
  baseRef: string,
  files: FileDiff[],
): void {
  _panel = DiffPanel.createOrShow(ctx.extensionUri, _viewedStore!);
  _panel.onRefresh(() => refreshCommand());
  _viewedStore!.prune(_repoRoot!, baseRef, new Set(files.map((f) => f.path)));
  _panel.setScope(_repoRoot!, baseRef);
  _panel.postMessage({
    type: 'init',
    files,
    baseRef,
    viewed: _viewedStore!.getForScope(_repoRoot!, baseRef),
  });
}

export function deactivate(): void {
  // nothing — disposables cleaned up via ctx.subscriptions
}
