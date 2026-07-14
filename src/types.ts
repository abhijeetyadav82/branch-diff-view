export interface FileChange {
  path: string;
  oldPath?: string;      // set on renames
  status: 'A' | 'M' | 'D' | 'R' | 'C' | 'B' | string;
  additions: number;
  deletions: number;
}

export interface DiffLine {
  type: 'context' | 'add' | 'del' | 'no-newline';
  text: string;          // raw line content without leading +/-/space
  oldNo?: number;
  newNo?: number;
}

export interface Hunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface FileDiff {
  path: string;
  oldPath?: string;
  status: FileChange['status'];
  additions: number;
  deletions: number;
  binary: boolean;
  hunks: Hunk[];
}

// Messages between extension and webview
export type ExtToWeb =
  | { type: 'init'; files: FileDiff[]; baseRef: string; viewed: Record<string, boolean> }
  | { type: 'viewedUpdate'; viewed: Record<string, boolean> }
  | { type: 'toggleLayout' };

export type WebToExt =
  | { type: 'setViewed'; path: string; value: boolean }
  | { type: 'refresh' }
  | { type: 'ready' };
