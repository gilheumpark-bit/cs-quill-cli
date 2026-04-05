// ============================================================
// CS Quill 🦔 — Git Deep Adapter
// ============================================================
// Aider의 Git 통합을 로컬 git CLI로 대체.
// blame, branch, auto-commit, diff, history.

import { execSync } from 'child_process';

// Shell argument sanitizer — injection 방지
function sanitize(arg: string): string {
  return arg.replace(/[`$\\!;"'|&<>(){}]/g, '');
}

// ============================================================
// PART 1 — Git Info
// ============================================================

export function isGitRepo(rootPath: string): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', { cwd: rootPath, encoding: 'utf-8', stdio: 'pipe' });
    return true;
  } catch { return false; }
}

export function getCurrentBranch(rootPath: string): string {
  try {
    return execSync('git branch --show-current', { cwd: rootPath, encoding: 'utf-8', stdio: 'pipe' }).trim();
  } catch { return 'unknown'; }
}

export function getLastCommit(rootPath: string): { hash: string; message: string; author: string; date: string } | null {
  try {
    const output = execSync('git log -1 --pretty=format:"%H|%s|%an|%ai"', { cwd: rootPath, encoding: 'utf-8', stdio: 'pipe' });
    const [hash, message, author, date] = output.split('|');
    return { hash, message, author, date };
  } catch { return null; }
}

export function getStatus(rootPath: string): { modified: string[]; untracked: string[]; staged: string[] } {
  try {
    const output = execSync('git status --porcelain', { cwd: rootPath, encoding: 'utf-8', stdio: 'pipe' });
    const modified: string[] = [];
    const untracked: string[] = [];
    const staged: string[] = [];

    for (const line of output.split('\n').filter(Boolean)) {
      const status = line.slice(0, 2);
      const file = line.slice(3);
      if (status.includes('?')) untracked.push(file);
      else if (status[0] !== ' ') staged.push(file);
      else modified.push(file);
    }

    return { modified, untracked, staged };
  } catch { return { modified: [], untracked: [], staged: [] }; }
}

// IDENTITY_SEAL: PART-1 | role=git-info | inputs=rootPath | outputs=branch,commit,status

// ============================================================
// PART 2 — Git Blame
// ============================================================

export interface BlameLine {
  hash: string;
  author: string;
  date: string;
  line: number;
  content: string;
}

export function blame(rootPath: string, filePath: string): BlameLine[] {
  try {
    const output = execSync(`git blame --porcelain "${filePath}" 2>/dev/null`, {
      cwd: rootPath, encoding: 'utf-8', stdio: 'pipe',
    });

    const results: BlameLine[] = [];
    const lines = output.split('\n');
    let currentHash = '';
    let currentAuthor = '';
    let currentDate = '';
    let lineNum = 0;

    for (const line of lines) {
      const hashMatch = line.match(/^([0-9a-f]{40})\s+(\d+)\s+(\d+)/);
      if (hashMatch) {
        currentHash = hashMatch[1].slice(0, 8);
        lineNum = parseInt(hashMatch[3], 10);
        continue;
      }
      if (line.startsWith('author ')) currentAuthor = line.slice(7);
      if (line.startsWith('author-time ')) currentDate = new Date(parseInt(line.slice(12), 10) * 1000).toISOString().slice(0, 10);
      if (line.startsWith('\t')) {
        results.push({ hash: currentHash, author: currentAuthor, date: currentDate, line: lineNum, content: line.slice(1) });
      }
    }

    return results;
  } catch { return []; }
}

// IDENTITY_SEAL: PART-2 | role=blame | inputs=rootPath,filePath | outputs=BlameLine[]

// ============================================================
// PART 3 — Git Diff
// ============================================================

export function diff(rootPath: string, ref?: string): string {
  try {
    const cmd = ref ? `git diff "${sanitize(ref)}"` : 'git diff';
    return execSync(cmd, { cwd: rootPath, encoding: 'utf-8', stdio: 'pipe' });
  } catch { return ''; }
}

export function diffStat(rootPath: string, ref?: string): Array<{ file: string; added: number; removed: number }> {
  try {
    const cmd = ref ? `git diff --numstat "${sanitize(ref)}"` : 'git diff --numstat';
    const output = execSync(cmd, { cwd: rootPath, encoding: 'utf-8', stdio: 'pipe' });

    return output.split('\n').filter(Boolean).map(line => {
      const [added, removed, file] = line.split('\t');
      return { file, added: parseInt(added, 10) || 0, removed: parseInt(removed, 10) || 0 };
    });
  } catch { return []; }
}

// IDENTITY_SEAL: PART-3 | role=diff | inputs=rootPath,ref | outputs=string,stat

// ============================================================
// PART 4 — Auto Operations
// ============================================================

export function autoStash(rootPath: string, message: string = 'cs-quill-auto'): boolean {
  try {
    execSync(`git stash push -m "${sanitize(message)}"`, { cwd: rootPath, stdio: 'pipe' });
    return true;
  } catch { return false; }
}

export function autoStashPop(rootPath: string): boolean {
  try {
    execSync('git stash pop', { cwd: rootPath, stdio: 'pipe' });
    return true;
  } catch { return false; }
}

export function autoCommit(rootPath: string, files: string[], message: string): boolean {
  try {
    for (const file of files) {
      execSync(`git add "${sanitize(file)}"`, { cwd: rootPath, stdio: 'pipe' });
    }
    execSync(`git commit -m "${sanitize(message)}"`, { cwd: rootPath, stdio: 'pipe' });
    return true;
  } catch { return false; }
}

export function autoBranch(rootPath: string, branchName: string): boolean {
  try {
    const safe = sanitize(branchName);
    execSync(`git checkout -b "${safe}" 2>/dev/null || git checkout "${safe}"`, { cwd: rootPath, stdio: 'pipe' });
    return true;
  } catch { return false; }
}

// IDENTITY_SEAL: PART-4 | role=auto-ops | inputs=rootPath | outputs=boolean

// ============================================================
// PART 5 — History Analysis
// ============================================================

export function getRecentHistory(rootPath: string, limit: number = 20): Array<{ hash: string; message: string; author: string; date: string; files: number }> {
  try {
    const output = execSync(`git log --oneline --numstat -${limit} --pretty=format:"COMMIT|%h|%s|%an|%ai"`, {
      cwd: rootPath, encoding: 'utf-8', stdio: 'pipe',
    });

    const commits: Array<{ hash: string; message: string; author: string; date: string; files: number }> = [];
    let current: typeof commits[0] | null = null;

    for (const line of output.split('\n')) {
      if (line.startsWith('COMMIT|')) {
        if (current) commits.push(current);
        const [, hash, message, author, date] = line.split('|');
        current = { hash, message, author, date, files: 0 };
      } else if (current && line.trim()) {
        current.files++;
      }
    }
    if (current) commits.push(current);

    return commits;
  } catch { return []; }
}

export function getFileHotspots(rootPath: string, limit: number = 10): Array<{ file: string; commits: number }> {
  try {
    const output = execSync('git log --name-only --pretty=format:"" --since="30 days ago" -- "*.ts" "*.tsx" 2>/dev/null', {
      cwd: rootPath, encoding: 'utf-8', stdio: 'pipe',
    });

    const counts = new Map<string, number>();
    for (const line of output.split('\n').filter(Boolean)) {
      counts.set(line, (counts.get(line) ?? 0) + 1);
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([file, commits]) => ({ file, commits }));
  } catch { return []; }
}

// IDENTITY_SEAL: PART-5 | role=history | inputs=rootPath | outputs=commits,hotspots
