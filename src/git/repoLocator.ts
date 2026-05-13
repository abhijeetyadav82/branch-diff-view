import * as vscode from 'vscode';

export async function findRepoRoot(): Promise<string | undefined> {
  // Try the built-in vscode.git extension first
  const gitExt = vscode.extensions.getExtension('vscode.git');
  if (gitExt) {
    const api = gitExt.isActive ? gitExt.exports : await gitExt.activate();
    const gitApi = api.getAPI(1);
    if (gitApi.repositories.length > 0) {
      return gitApi.repositories[0].rootUri.fsPath;
    }
  }

  // Fallback: walk up from first workspace folder
  const folders = vscode.workspace.workspaceFolders;
  if (folders && folders.length > 0) {
    return folders[0].uri.fsPath;
  }

  return undefined;
}
