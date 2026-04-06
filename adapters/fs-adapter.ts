// ============================================================
// CS Quill 🦔 — File System Adapter
// ============================================================
// 웹의 IndexedDB/localStorage → CLI의 로컬 파일시스템.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync, copyFileSync, renameSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { getGlobalConfigDir } from '../core/config';

// ============================================================
// PART 1 — Key-Value Store (localStorage 대체)
// ============================================================

const STORE_DIR = () => join(getGlobalConfigDir(), 'store');

export function storeGet(key: string): string | null {
  const path = join(STORE_DIR(), `${key}.json`);
  if (!existsSync(path)) return null;
  try { return readFileSync(path, 'utf-8'); } catch { return null; }
}

export function storeSet(key: string, value: string): void {
  mkdirSync(STORE_DIR(), { recursive: true });
  writeFileSync(join(STORE_DIR(), `${key}.json`), value, 'utf-8');
}

export function storeDelete(key: string): void {
  const path = join(STORE_DIR(), `${key}.json`);
  if (existsSync(path)) unlinkSync(path);
}

export function storeKeys(): string[] {
  if (!existsSync(STORE_DIR())) return [];
  return readdirSync(STORE_DIR())
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));
}

// IDENTITY_SEAL: PART-1 | role=kv-store | inputs=key,value | outputs=string|null

// ============================================================
// PART 2 — Project File Tree (FileNode 호환)
// ============================================================

export interface CLIFileNode {
  name: string;
  type: 'file' | 'directory';
  content?: string;
  children?: CLIFileNode[];
}

const IGNORE = new Set(['node_modules', '.next', '.git', 'dist', 'build', '.cs']);

export function readFileTree(rootPath: string, maxDepth: number = 5): CLIFileNode {
  function walk(dir: string, depth: number): CLIFileNode {
    const name = dir.split('/').pop() ?? dir;
    if (depth > maxDepth) return { name, type: 'directory', children: [] };

    const children: CLIFileNode[] = [];
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || IGNORE.has(entry.name)) continue;
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          children.push(walk(fullPath, depth + 1));
        } else {
          const node: CLIFileNode = { name: entry.name, type: 'file' };
          if (/\.(ts|tsx|js|jsx|json|css|html|md)$/.test(entry.name)) {
            try { node.content = readFileSync(fullPath, 'utf-8'); } catch { /* skip */ }
          }
          children.push(node);
        }
      }
    } catch { /* skip unreadable */ }

    return { name, type: 'directory', children };
  }

  return walk(rootPath, 0);
}

// IDENTITY_SEAL: PART-2 | role=file-tree | inputs=rootPath | outputs=CLIFileNode

// ============================================================
// PART 3 — AI Response Cache
// ============================================================

const CACHE_DIR = () => join(getGlobalConfigDir(), 'cache');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export function cacheGet(hash: string): string | null {
  const path = join(CACHE_DIR(), `${hash}.json`);
  if (!existsSync(path)) return null;
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    if (Date.now() - data.timestamp > CACHE_TTL_MS) {
      unlinkSync(path);
      return null;
    }
    return data.response;
  } catch { return null; }
}

export function cacheSet(hash: string, response: string): void {
  if (response.length < 20) return; // Skip short/error responses
  mkdirSync(CACHE_DIR(), { recursive: true });
  writeFileSync(join(CACHE_DIR(), `${hash}.json`), JSON.stringify({ timestamp: Date.now(), response }));
}

// IDENTITY_SEAL: PART-3 | role=ai-cache | inputs=hash,response | outputs=string|null

// ============================================================
// PART 4 — Atomic File Write
// ============================================================

/**
 * Write file atomically: write to temp, verify, then rename.
 * Prevents data corruption if the process crashes mid-write.
 */
export function atomicWriteSync(filePath: string, content: string, encoding: BufferEncoding = 'utf-8'): void {
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });

  const tmpPath = filePath + '.tmp.' + process.pid + '.' + Date.now();

  try {
    writeFileSync(tmpPath, content, encoding);

    // Verify written content matches
    const written = readFileSync(tmpPath, encoding);
    if (written.length !== content.length) {
      throw new Error(`Atomic write verification failed: expected ${content.length} chars, got ${written.length}`);
    }

    // Atomic rename
    renameSync(tmpPath, filePath);
  } catch (err) {
    // Cleanup temp file on failure
    try { if (existsSync(tmpPath)) unlinkSync(tmpPath); } catch { /* ignore */ }
    throw err;
  }
}

// IDENTITY_SEAL: PART-4 | role=atomic-write | inputs=filePath,content | outputs=void

// ============================================================
// PART 5 — File Backup Manager
// ============================================================

const BACKUP_DIR = () => join(getGlobalConfigDir(), 'backups');
const MAX_BACKUPS_PER_FILE = 5;

/**
 * Create a backup of a file before modifying it.
 * Returns the backup path, or null if backup failed.
 */
export function createBackup(filePath: string): string | null {
  if (!existsSync(filePath)) return null;

  try {
    const backupDir = BACKUP_DIR();
    mkdirSync(backupDir, { recursive: true });

    // Use a safe filename: replace path separators and colons
    const safeName = filePath.replace(/[\\/]/g, '__').replace(/:/g, '_');
    const timestamp = Date.now();
    const backupPath = join(backupDir, `${safeName}.${timestamp}`);

    copyFileSync(filePath, backupPath);

    // Prune old backups for this file (keep only MAX_BACKUPS_PER_FILE)
    pruneBackups(safeName);

    return backupPath;
  } catch {
    return null;
  }
}

/**
 * Restore the most recent backup of a file.
 * Returns true if restore succeeded.
 */
export function restoreBackup(filePath: string): boolean {
  const backupDir = BACKUP_DIR();
  if (!existsSync(backupDir)) return false;

  const safeName = filePath.replace(/[\\/]/g, '__').replace(/:/g, '_');

  try {
    const backups = readdirSync(backupDir)
      .filter(f => f.startsWith(safeName + '.'))
      .sort()
      .reverse();

    if (backups.length === 0) return false;

    const latestBackup = join(backupDir, backups[0]);
    const dir = dirname(filePath);
    mkdirSync(dir, { recursive: true });
    copyFileSync(latestBackup, filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * List available backups for a file.
 */
export function listBackups(filePath: string): Array<{ path: string; timestamp: number; size: number }> {
  const backupDir = BACKUP_DIR();
  if (!existsSync(backupDir)) return [];

  const safeName = filePath.replace(/[\\/]/g, '__').replace(/:/g, '_');

  try {
    return readdirSync(backupDir)
      .filter(f => f.startsWith(safeName + '.'))
      .sort()
      .reverse()
      .map(f => {
        const fullPath = join(backupDir, f);
        const tsMatch = f.match(/\.(\d+)$/);
        const timestamp = tsMatch ? parseInt(tsMatch[1], 10) : 0;
        let size = 0;
        try { size = statSync(fullPath).size; } catch { /* skip */ }
        return { path: fullPath, timestamp, size };
      });
  } catch {
    return [];
  }
}

function pruneBackups(safeName: string): void {
  const backupDir = BACKUP_DIR();
  try {
    const backups = readdirSync(backupDir)
      .filter(f => f.startsWith(safeName + '.'))
      .sort();

    while (backups.length > MAX_BACKUPS_PER_FILE) {
      const oldest = backups.shift();
      if (oldest) {
        try { unlinkSync(join(backupDir, oldest)); } catch { /* ignore */ }
      }
    }
  } catch { /* ignore */ }
}

// IDENTITY_SEAL: PART-5 | role=backup-manager | inputs=filePath | outputs=backupPath

// ============================================================
// PART 6 — Safe File Operations (error-wrapped)
// ============================================================

/**
 * Read file safely, returning null on any error.
 */
export function safeReadFile(filePath: string, encoding: BufferEncoding = 'utf-8'): string | null {
  try {
    if (!existsSync(filePath)) return null;
    return readFileSync(filePath, encoding);
  } catch {
    return null;
  }
}

/**
 * Write file safely with optional backup. Returns success status.
 */
export function safeWriteFile(filePath: string, content: string, opts?: {
  backup?: boolean;
  atomic?: boolean;
  encoding?: BufferEncoding;
}): { success: boolean; backupPath?: string; error?: string } {
  const encoding = opts?.encoding ?? 'utf-8';

  try {
    let backupPath: string | undefined;
    if (opts?.backup && existsSync(filePath)) {
      backupPath = createBackup(filePath) ?? undefined;
    }

    if (opts?.atomic) {
      atomicWriteSync(filePath, content, encoding);
    } else {
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, content, encoding);
    }

    return { success: true, backupPath };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Delete file safely, returning success status.
 */
export function safeDeleteFile(filePath: string): boolean {
  try {
    if (!existsSync(filePath)) return true;
    unlinkSync(filePath);
    return true;
  } catch {
    return false;
  }
}

// IDENTITY_SEAL: PART-6 | role=safe-file-ops | inputs=filePath,content | outputs=result
