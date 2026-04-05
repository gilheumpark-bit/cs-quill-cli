// ============================================================
// CS Quill 🦔 — File System Adapter
// ============================================================
// 웹의 IndexedDB/localStorage → CLI의 로컬 파일시스템.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
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
