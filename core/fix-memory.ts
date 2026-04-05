// ============================================================
// CS Quill 🦔 — Fix Memory
// ============================================================
// 과거 수정 패턴 기억. 유사 버그 자동 적용.
// SQLite 대신 JSON 파일 기반 (의존성 최소화).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { getGlobalConfigDir } from './config';

// ============================================================
// PART 1 — Types
// ============================================================

export interface FixPattern {
  id: string;
  category: string;
  description: string;
  beforePattern: string;
  afterPattern: string;
  confidence: number;
  appliedCount: number;
  acceptedCount: number;
  rejectedCount: number;
  lastApplied: number;
  projectId?: string;
}

export interface FixMemoryDB {
  version: 1;
  patterns: FixPattern[];
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=FixPattern,FixMemoryDB

// ============================================================
// PART 2 — Storage
// ============================================================

function getDBPath(): string {
  return join(getGlobalConfigDir(), 'fix-memory.json');
}

function loadDB(): FixMemoryDB {
  const path = getDBPath();
  if (!existsSync(path)) return { version: 1, patterns: [] };
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return { version: 1, patterns: [] };
  }
}

function saveDB(db: FixMemoryDB): void {
  mkdirSync(getGlobalConfigDir(), { recursive: true });
  writeFileSync(getDBPath(), JSON.stringify(db, null, 2));
}

// IDENTITY_SEAL: PART-2 | role=storage | inputs=none | outputs=FixMemoryDB

// ============================================================
// PART 3 — Pattern Matching (Jaro-Winkler inspired similarity)
// ============================================================

function similarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (a.length === 0 || b.length === 0) return 0;

  const maxLen = Math.max(a.length, b.length);
  const window = Math.floor(maxLen / 2) - 1;
  const aMatches = new Array(a.length).fill(false);
  const bMatches = new Array(b.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - window);
    const end = Math.min(i + window + 1, b.length);
    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  const jaro = (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;

  // Winkler prefix bonus
  let prefix = 0;
  for (let i = 0; i < Math.min(4, a.length, b.length); i++) {
    if (a[i] !== b[i]) break;
    prefix++;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

// IDENTITY_SEAL: PART-3 | role=similarity | inputs=string,string | outputs=number

// ============================================================
// PART 4 — Public API
// ============================================================

const SIMILARITY_THRESHOLD = 0.7;
const MAX_PATTERNS = 500;

export function recordFix(pattern: Omit<FixPattern, 'id' | 'appliedCount' | 'acceptedCount' | 'rejectedCount' | 'lastApplied'>): void {
  const db = loadDB();

  // Check for existing similar pattern
  const existing = db.patterns.find(p =>
    p.category === pattern.category &&
    similarity(p.description, pattern.description) > SIMILARITY_THRESHOLD,
  );

  if (existing) {
    existing.appliedCount++;
    existing.lastApplied = Date.now();
    existing.confidence = Math.min(1, existing.confidence + 0.05);
  } else {
    db.patterns.push({
      ...pattern,
      id: `fix-${Date.now().toString(36)}`,
      appliedCount: 1,
      acceptedCount: 0,
      rejectedCount: 0,
      lastApplied: Date.now(),
    });
  }

  // Prune: remove low confidence + old patterns
  db.patterns = db.patterns.filter(p => p.confidence > 0.1 || Date.now() - p.lastApplied < 30 * 24 * 60 * 60 * 1000);
  if (db.patterns.length > MAX_PATTERNS) {
    db.patterns.sort((a, b) => b.confidence * b.appliedCount - a.confidence * a.appliedCount);
    db.patterns = db.patterns.slice(0, MAX_PATTERNS);
  }

  saveDB(db);
}

export function recordAcceptance(patternId: string, accepted: boolean): void {
  const db = loadDB();
  const pattern = db.patterns.find(p => p.id === patternId);
  if (!pattern) return;

  if (accepted) {
    pattern.acceptedCount++;
    pattern.confidence = Math.min(1, pattern.confidence + 0.1);
  } else {
    pattern.rejectedCount++;
    pattern.confidence = Math.max(0, pattern.confidence - 0.15);
  }

  saveDB(db);
}

export function findSimilarFixes(description: string, category?: string): FixPattern[] {
  const db = loadDB();
  return db.patterns
    .filter(p => (!category || p.category === category) && similarity(p.description, description) >= SIMILARITY_THRESHOLD)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
}

export function getTopPatterns(limit: number = 10): FixPattern[] {
  const db = loadDB();
  return db.patterns
    .sort((a, b) => b.appliedCount - a.appliedCount)
    .slice(0, limit);
}

export function getStats(): { total: number; avgConfidence: number; topCategories: Array<{ category: string; count: number }> } {
  const db = loadDB();
  const categoryMap = new Map<string, number>();
  for (const p of db.patterns) {
    categoryMap.set(p.category, (categoryMap.get(p.category) ?? 0) + p.appliedCount);
  }
  return {
    total: db.patterns.length,
    avgConfidence: db.patterns.length > 0 ? db.patterns.reduce((s, p) => s + p.confidence, 0) / db.patterns.length : 0,
    topCategories: [...categoryMap.entries()].sort((a, b) => b[1] - a[1]).map(([category, count]) => ({ category, count })),
  };
}

// IDENTITY_SEAL: PART-4 | role=public-api | inputs=pattern,description | outputs=FixPattern[]
