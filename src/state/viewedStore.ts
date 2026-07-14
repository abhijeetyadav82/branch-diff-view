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

  /** Drop entries in this scope for files no longer part of the diff. */
  prune(repoRoot: string, baseRef: string, keepPaths: ReadonlySet<string>): void {
    const prefix = `${repoRoot}::${baseRef}::`;
    let dirty = false;
    for (const key of Object.keys(this._data)) {
      if (key.startsWith(prefix) && !keepPaths.has(key.slice(prefix.length))) {
        delete this._data[key];
        dirty = true;
      }
    }
    if (dirty) this._memento.update(STORE_KEY, this._data);
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
