// ============================================================
// CS Quill 🦔 — cs bookmark command
// ============================================================
// 자주 쓰는 프롬프트 저장/실행.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { getGlobalConfigDir } from '../core/config';
import { runGenerate } from './generate';

// ============================================================
// PART 1 — Storage
// ============================================================

interface Bookmark {
  name: string;
  prompt: string;
  options?: Record<string, string>;
  createdAt: number;
  usedCount: number;
}

interface BookmarkDB {
  bookmarks: Bookmark[];
}

function getDBPath(): string {
  return join(getGlobalConfigDir(), 'bookmarks.json');
}

function loadBookmarks(): BookmarkDB {
  const path = getDBPath();
  if (!existsSync(path)) return { bookmarks: [] };
  try { return JSON.parse(readFileSync(path, 'utf-8')); } catch { return { bookmarks: [] }; }
}

function saveBookmarks(db: BookmarkDB): void {
  mkdirSync(getGlobalConfigDir(), { recursive: true });
  writeFileSync(getDBPath(), JSON.stringify(db, null, 2));
}

// IDENTITY_SEAL: PART-1 | role=storage | inputs=none | outputs=BookmarkDB

// ============================================================
// PART 2 — Bookmark Runner
// ============================================================

export async function runBookmark(action: string, args?: string[]): Promise<void> {
  const db = loadBookmarks();

  switch (action) {
    case 'list': {
      if (db.bookmarks.length === 0) {
        console.log('  📭 저장된 북마크 없음\n');
        console.log('  추가: cs bookmark add "이름" "프롬프트"');
        return;
      }
      console.log('🦔 CS Quill — 북마크\n');
      for (const [i, b] of db.bookmarks.entries()) {
        console.log(`  [${i + 1}] ${b.name} (${b.usedCount}회 사용)`);
        console.log(`      "${b.prompt}"\n`);
      }
      break;
    }

    case 'add': {
      if (!args || args.length < 2) {
        console.log('  사용법: cs bookmark add "이름" "프롬프트"');
        return;
      }
      const [name, prompt] = args;
      db.bookmarks.push({ name, prompt, createdAt: Date.now(), usedCount: 0 });
      saveBookmarks(db);
      console.log(`  ✅ "${name}" 북마크 추가됨\n`);
      break;
    }

    case 'remove': {
      if (!args || args.length < 1) {
        console.log('  사용법: cs bookmark remove <번호>');
        return;
      }
      const idx = parseInt(args[0], 10) - 1;
      if (idx < 0 || idx >= db.bookmarks.length) {
        console.log('  ⚠️  잘못된 번호');
        return;
      }
      const removed = db.bookmarks.splice(idx, 1)[0];
      saveBookmarks(db);
      console.log(`  🗑️  "${removed.name}" 삭제됨\n`);
      break;
    }

    case 'run': {
      if (!args || args.length < 1) {
        console.log('  사용법: cs bookmark run <번호>');
        return;
      }
      const runIdx = parseInt(args[0], 10) - 1;
      if (runIdx < 0 || runIdx >= db.bookmarks.length) {
        console.log('  ⚠️  잘못된 번호');
        return;
      }
      const bookmark = db.bookmarks[runIdx];
      bookmark.usedCount++;
      saveBookmarks(db);
      console.log(`  🔖 "${bookmark.name}" 실행\n`);
      const opts = bookmark.options ?? {};
      await runGenerate(bookmark.prompt, {
        mode: (opts.mode as 'fast' | 'full' | 'strict') ?? 'full',
        structure: (opts.structure as 'auto' | 'on' | 'off') ?? 'auto',
        withTests: opts.withTests === 'true',
      });
      break;
    }

    default:
      console.log('  사용법: cs bookmark <list|add|remove|run>');
  }
}

// IDENTITY_SEAL: PART-2 | role=bookmark-runner | inputs=action,args | outputs=console
