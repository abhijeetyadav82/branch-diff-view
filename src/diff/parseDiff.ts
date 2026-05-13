import type { Hunk, DiffLine } from '../types';

export interface ParsedDiff {
  binary: boolean;
  hunks: Hunk[];
}

const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

export function parseDiff(raw: string): ParsedDiff {
  if (!raw || raw.includes('\nBinary files ') || raw.startsWith('Binary files ')) {
    return { binary: true, hunks: [] };
  }

  const lines = raw.split('\n');
  const hunks: Hunk[] = [];
  let hunk: Hunk | null = null;
  let oldNo = 0;
  let newNo = 0;

  for (const line of lines) {
    const hunkMatch = HUNK_HEADER.exec(line);
    if (hunkMatch) {
      hunk = {
        oldStart: parseInt(hunkMatch[1], 10),
        oldLines: hunkMatch[2] !== undefined ? parseInt(hunkMatch[2], 10) : 1,
        newStart: parseInt(hunkMatch[3], 10),
        newLines: hunkMatch[4] !== undefined ? parseInt(hunkMatch[4], 10) : 1,
        lines: [],
      };
      oldNo = hunk.oldStart;
      newNo = hunk.newStart;
      hunks.push(hunk);
      continue;
    }

    if (!hunk) continue;

    if (line.startsWith('+')) {
      hunk.lines.push({ type: 'add', text: line.slice(1), newNo: newNo++ });
    } else if (line.startsWith('-')) {
      hunk.lines.push({ type: 'del', text: line.slice(1), oldNo: oldNo++ });
    } else if (line.startsWith('\\')) {
      hunk.lines.push({ type: 'no-newline', text: line.slice(2) });
    } else if (line.startsWith(' ')) {
      hunk.lines.push({ type: 'context', text: line.slice(1), oldNo: oldNo++, newNo: newNo++ });
    }
    // skip diff --git / index / --- / +++ header lines (no leading space/+/-)
  }

  return { binary: false, hunks };
}
