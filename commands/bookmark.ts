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
  tags?: string[];
  createdAt: number;
  usedCount: number;
  lastUsedAt?: number;
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

// Fuzzy search: matches if all characters of query appear in target in order
function fuzzyMatch(query: string, target: string): { match: boolean; score: number } {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  // Exact substring match = highest score
  if (t.includes(q)) return { match: true, score: 1.0 };

  // Character-by-character fuzzy match
  let qi = 0;
  let consecutiveBonus = 0;
  let totalScore = 0;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      qi++;
      consecutiveBonus++;
      totalScore += consecutiveBonus;
    } else {
      consecutiveBonus = 0;
    }
  }

  if (qi < q.length) return { match: false, score: 0 };
  // Normalize: ratio of matched chars and bonus to target length
  const score = totalScore / (t.length + q.length);
  return { match: true, score: Math.min(score, 0.99) };
}

function searchBookmarks(db: BookmarkDB, query: string): Array<{ index: number; bookmark: Bookmark; score: number }> {
  const results: Array<{ index: number; bookmark: Bookmark; score: number }> = [];

  for (let i = 0; i < db.bookmarks.length; i++) {
    const b = db.bookmarks[i];
    // Match against name, prompt, and tags
    const nameMatch = fuzzyMatch(query, b.name);
    const promptMatch = fuzzyMatch(query, b.prompt);
    const tagMatch = (b.tags ?? []).reduce((best, tag) => {
      const m = fuzzyMatch(query, tag);
      return m.score > best.score ? m : best;
    }, { match: false, score: 0 });

    const bestScore = Math.max(nameMatch.score, promptMatch.score * 0.8, tagMatch.score * 0.9);
    if (nameMatch.match || promptMatch.match || tagMatch.match) {
      results.push({ index: i, bookmark: b, score: bestScore });
    }
  }

  return results.sort((a, b) => b.score - a.score);
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
        console.log('  추가: cs bookmark add "이름" "프롬프트" [--tags tag1,tag2]');
        return;
      }
      console.log('🦔 CS Quill — 북마크\n');
      for (const [i, b] of db.bookmarks.entries()) {
        const tags = (b.tags ?? []).length > 0 ? ` [${b.tags!.join(', ')}]` : '';
        const lastUsed = b.lastUsedAt ? ` | 마지막: ${new Date(b.lastUsedAt).toLocaleDateString()}` : '';
        console.log(`  [${i + 1}] ${b.name} (${b.usedCount}회 사용${lastUsed})${tags}`);
        console.log(`      "${b.prompt}"\n`);
      }
      break;
    }

    case 'add': {
      if (!args || args.length < 2) {
        console.log('  사용법: cs bookmark add "이름" "프롬프트" [--tags tag1,tag2]');
        return;
      }
      const [name, prompt, ...rest] = args;
      // Parse --tags flag
      let tags: string[] = [];
      const tagsIdx = rest.indexOf('--tags');
      if (tagsIdx !== -1 && rest[tagsIdx + 1]) {
        tags = rest[tagsIdx + 1].split(',').map(t => t.trim()).filter(Boolean);
      }
      db.bookmarks.push({ name, prompt, tags, createdAt: Date.now(), usedCount: 0 });
      saveBookmarks(db);
      const tagLabel = tags.length > 0 ? ` (태그: ${tags.join(', ')})` : '';
      console.log(`  ✅ "${name}" 북마크 추가됨${tagLabel}\n`);
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
        console.log('  사용법: cs bookmark run <번호 또는 이름>');
        return;
      }
      // Support both index and fuzzy name lookup
      let runIdx = parseInt(args[0], 10) - 1;
      if (isNaN(runIdx) || runIdx < 0 || runIdx >= db.bookmarks.length) {
        // Try fuzzy search by name
        const results = searchBookmarks(db, args[0]);
        if (results.length === 0) {
          console.log(`  ⚠️  "${args[0]}" 에 해당하는 북마크 없음`);
          return;
        }
        runIdx = results[0].index;
        if (results.length > 1) {
          console.log(`  ℹ️  "${results[0].bookmark.name}" 선택됨 (${results.length}건 매칭)\n`);
        }
      }
      const bookmark = db.bookmarks[runIdx];
      bookmark.usedCount++;
      bookmark.lastUsedAt = Date.now();
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

    case 'search': {
      if (!args || args.length < 1) {
        console.log('  사용법: cs bookmark search <검색어>');
        return;
      }
      const query = args.join(' ');
      const results = searchBookmarks(db, query);
      if (results.length === 0) {
        console.log(`  📭 "${query}" 에 해당하는 북마크 없음\n`);
        return;
      }
      console.log(`🦔 CS Quill — 북마크 검색: "${query}" (${results.length}건)\n`);
      for (const r of results) {
        const tags = (r.bookmark.tags ?? []).length > 0 ? ` [${r.bookmark.tags!.join(', ')}]` : '';
        const scoreLabel = r.score >= 1 ? '완전일치' : `유사도 ${Math.round(r.score * 100)}%`;
        console.log(`  [${r.index + 1}] ${r.bookmark.name} (${scoreLabel})${tags}`);
        console.log(`      "${r.bookmark.prompt}"\n`);
      }
      break;
    }

    case 'tag': {
      if (!args || args.length < 2) {
        console.log('  사용법: cs bookmark tag <번호> <tag1,tag2,...>');
        return;
      }
      const tagIdx = parseInt(args[0], 10) - 1;
      if (tagIdx < 0 || tagIdx >= db.bookmarks.length) {
        console.log('  ⚠️  잘못된 번호');
        return;
      }
      const newTags = args[1].split(',').map(t => t.trim()).filter(Boolean);
      const target = db.bookmarks[tagIdx];
      const existing = new Set(target.tags ?? []);
      for (const t of newTags) existing.add(t);
      target.tags = [...existing];
      saveBookmarks(db);
      console.log(`  🏷️  "${target.name}" 태그 업데이트: [${target.tags.join(', ')}]\n`);
      break;
    }

    case 'top': {
      if (db.bookmarks.length === 0) {
        console.log('  📭 저장된 북마크 없음\n');
        return;
      }
      const limit = (args && args[0]) ? parseInt(args[0], 10) : 5;
      const sorted = [...db.bookmarks]
        .map((b, i) => ({ ...b, originalIndex: i }))
        .sort((a, b) => b.usedCount - a.usedCount)
        .slice(0, limit);

      console.log(`🦔 CS Quill — 자주 사용하는 북마크 (Top ${Math.min(limit, sorted.length)})\n`);
      for (const b of sorted) {
        const tags = (b.tags ?? []).length > 0 ? ` [${b.tags!.join(', ')}]` : '';
        const lastUsed = b.lastUsedAt ? ` | 마지막: ${new Date(b.lastUsedAt).toLocaleDateString()}` : '';
        console.log(`  [${b.originalIndex + 1}] ${b.name} — ${b.usedCount}회 사용${lastUsed}${tags}`);
      }
      console.log('');
      break;
    }

    default:
      console.log('  사용법: cs bookmark <list|add|remove|run|search|tag|top>');
      console.log('');
      console.log('  list              북마크 목록');
      console.log('  add "이름" "프롬프트" [--tags t1,t2]  북마크 추가');
      console.log('  remove <번호>     북마크 삭제');
      console.log('  run <번호|이름>   북마크 실행 (퍼지 매칭 지원)');
      console.log('  search <검색어>   이름/프롬프트/태그로 퍼지 검색');
      console.log('  tag <번호> <태그>  태그 추가 (콤마 구분)');
      console.log('  top [N]           가장 많이 사용한 북마크 (기본 5개)');
  }
}

// IDENTITY_SEAL: PART-2 | role=bookmark-runner | inputs=action,args | outputs=console
