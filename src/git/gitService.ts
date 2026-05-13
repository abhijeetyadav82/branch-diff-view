import simpleGit, { SimpleGit } from 'simple-git';
import type { FileChange, FileDiff } from '../types';
import { parseDiff } from '../diff/parseDiff';

export class GitService {
  private git: SimpleGit;

  constructor(repoRoot: string) {
    this.git = simpleGit(repoRoot);
  }

  async listBranches(): Promise<string[]> {
    const result = await this.git.branchLocal();
    return result.all;
  }

  async currentBranch(): Promise<string> {
    const result = await this.git.branchLocal();
    return result.current;
  }

  async listChangedFiles(base: string, head: string = 'HEAD'): Promise<FileChange[]> {
    const range = `${base}...${head}`;

    // --name-status gives us path + status (with rename old→new)
    const nameStatus = await this.git.raw(['diff', '--name-status', range]);
    // --numstat gives us additions/deletions (binary shows as -)
    const numStat = await this.git.raw(['diff', '--numstat', range]);

    const changes = parseNameStatus(nameStatus);
    applyNumStat(changes, numStat);
    return changes;
  }

  async getFileDiff(base: string, head: string, filePath: string): Promise<string> {
    const range = `${base}...${head}`;
    try {
      return await this.git.raw(['diff', '--unified=3', range, '--', filePath]);
    } catch {
      return '';
    }
  }

  async buildFileDiffs(base: string, head: string = 'HEAD'): Promise<FileDiff[]> {
    const files = await this.listChangedFiles(base, head);
    const diffs: FileDiff[] = [];
    for (const f of files) {
      const lookupPath = f.path;
      const raw = await this.getFileDiff(base, head, lookupPath);
      const parsed = parseDiff(raw);
      diffs.push({
        path: f.path,
        oldPath: f.oldPath,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        binary: parsed.binary,
        hunks: parsed.hunks,
      });
    }
    return diffs;
  }
}

function parseNameStatus(raw: string): FileChange[] {
  const changes: FileChange[] = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    const parts = line.split('\t');
    const statusCode = parts[0].trim();

    if (statusCode.startsWith('R') || statusCode.startsWith('C')) {
      // R100\told_path\tnew_path
      changes.push({
        path: parts[2],
        oldPath: parts[1],
        status: statusCode[0],
        additions: 0,
        deletions: 0,
      });
    } else {
      changes.push({
        path: parts[1],
        status: statusCode,
        additions: 0,
        deletions: 0,
      });
    }
  }
  return changes;
}

function applyNumStat(changes: FileChange[], raw: string): void {
  const statsMap = new Map<string, { additions: number; deletions: number }>();
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    const parts = line.split('\t');
    if (parts.length < 3) continue;
    const adds = parts[0] === '-' ? 0 : parseInt(parts[0], 10);
    const dels = parts[1] === '-' ? 0 : parseInt(parts[1], 10);
    // numstat uses "old => new" notation for renames
    const pathPart = parts[2];
    const path = resolveNumStatPath(pathPart);
    statsMap.set(path, { additions: isNaN(adds) ? 0 : adds, deletions: isNaN(dels) ? 0 : dels });
  }

  for (const change of changes) {
    const stats = statsMap.get(change.path);
    if (stats) {
      change.additions = stats.additions;
      change.deletions = stats.deletions;
    }
  }
}

function resolveNumStatPath(pathPart: string): string {
  // Git numstat represents renames as "src/{a => b}/file" or "old => new"
  // For matching purposes, extract the new path
  const arrowMatch = /\{[^}]* => ([^}]*)\}/.exec(pathPart);
  if (arrowMatch) {
    return pathPart.replace(/\{[^}]* => ([^}]*)\}/, arrowMatch[1]).replace('//', '/');
  }
  const simpleArrow = / => /.exec(pathPart);
  if (simpleArrow) {
    return pathPart.split(' => ')[1];
  }
  return pathPart;
}
