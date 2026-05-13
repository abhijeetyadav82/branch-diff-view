import * as vscode from 'vscode';

const STORE_KEY = 'branchDiff.viewed';

export class ViewedStore {
  private _data: Record<string, boolean>;

  constructor(private readonly _memento: vscode.Memento) {
    this._data = _memento.get<Record<string, boolean>>(STORE_KEY, {});
  }

  makeKey(repoRoot: string, baseRef: string, filePath: string): string {
    return `${repoRoot}::${baseRef}::${filePath}`;
  }

  set(key: string, value: boolean): void {
    this._data[key] = value;
    this._memento.update(STORE_KEY, this._data);
  }

  get(key: string): boolean {
    return this._data[key] ?? false;
  }

  getAll(): Record<string, boolean> {
    return { ...this._data };
  }

  getForScope(repoRoot: string, baseRef: string): Record<string, boolean> {
    const prefix = `${repoRoot}::${baseRef}::`;
    const result: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(this._data)) {
      if (k.startsWith(prefix)) {
        result[k.slice(prefix.length)] = v;
      }
    }
    return result;
  }
}
