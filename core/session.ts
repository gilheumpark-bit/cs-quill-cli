// ============================================================
// CS Quill 🦔 — Session Manager
// ============================================================
// 작업 상태 저장 / 복원. CLI 세션 관리.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { getGlobalConfigDir } from './config';

// ============================================================
// PART 1 — Types
// ============================================================

export interface Session {
  id: string;
  projectPath: string;
  projectName: string;
  createdAt: number;
  updatedAt: number;
  lastCommand: string;
  openFiles: string[];
  lastVerifyScore?: number;
  lastPlaygroundScore?: number;
  receipts: string[];
  notes?: string;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=Session

// ============================================================
// PART 2 — Storage
// ============================================================

function getSessionDir(): string {
  return join(getGlobalConfigDir(), 'sessions');
}

function getSessionPath(id: string): string {
  return join(getSessionDir(), `${id}.json`);
}

function generateSessionId(): string {
  return `session-${Date.now().toString(36)}`;
}

// IDENTITY_SEAL: PART-2 | role=storage | inputs=none | outputs=paths

// ============================================================
// PART 3 — CRUD
// ============================================================

export function createSession(projectPath: string): Session {
  const session: Session = {
    id: generateSessionId(),
    projectPath,
    projectName: projectPath.split(/[/\\]/).pop() ?? 'unknown',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastCommand: 'init',
    openFiles: [],
    receipts: [],
  };

  mkdirSync(getSessionDir(), { recursive: true });
  writeFileSync(getSessionPath(session.id), JSON.stringify(session, null, 2));
  return session;
}

export function loadSession(id: string): Session | null {
  const path = getSessionPath(id);
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, 'utf-8')); } catch { return null; }
}

export function updateSession(id: string, updates: Partial<Session>): void {
  const session = loadSession(id);
  if (!session) return;
  Object.assign(session, updates, { updatedAt: Date.now() });
  writeFileSync(getSessionPath(id), JSON.stringify(session, null, 2));
}

export function deleteSession(id: string): boolean {
  const path = getSessionPath(id);
  if (!existsSync(path)) return false;
  unlinkSync(path);
  return true;
}

const SESSION_TTL = 30 * 24 * 60 * 60 * 1000; // 30일

export function listSessions(): Session[] {
  const dir = getSessionDir();
  if (!existsSync(dir)) return [];
  const now = Date.now();
  const sessions = readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try { return { session: JSON.parse(readFileSync(join(dir, f), 'utf-8')) as Session, file: f }; } catch { return null; }
    })
    .filter((s): s is { session: Session; file: string } => s !== null);

  // 만료 세션 자동 정리
  const active: Session[] = [];
  for (const { session, file } of sessions) {
    if (now - session.updatedAt > SESSION_TTL) {
      try { unlinkSync(join(dir, file)); } catch { /* skip */ }
    } else {
      active.push(session);
    }
  }

  return active.sort((a, b) => b.updatedAt - a.updatedAt);
}

// IDENTITY_SEAL: PART-3 | role=crud | inputs=Session | outputs=Session

// ============================================================
// PART 4 — Auto Session (현재 프로젝트)
// ============================================================

let _currentSessionId: string | null = null;

export function getCurrentSession(): Session | null {
  if (_currentSessionId) return loadSession(_currentSessionId);

  const projectPath = process.cwd();
  const sessions = listSessions();
  const existing = sessions.find(s => s.projectPath === projectPath);

  if (existing) {
    _currentSessionId = existing.id;
    return existing;
  }

  return null;
}

export function ensureSession(): Session {
  const current = getCurrentSession();
  if (current) return current;

  const session = createSession(process.cwd());
  _currentSessionId = session.id;
  return session;
}

export function recordCommand(command: string): void {
  const session = ensureSession();
  updateSession(session.id, { lastCommand: command });
}

export function recordFile(filePath: string): void {
  const session = ensureSession();
  const files = new Set(session.openFiles);
  files.add(filePath);
  // Keep last 20
  const arr = [...files].slice(-20);
  updateSession(session.id, { openFiles: arr });
}

export function recordReceipt(receiptId: string): void {
  const session = ensureSession();
  const receipts = [...session.receipts, receiptId].slice(-50);
  updateSession(session.id, { receipts });
}

export function recordScore(type: 'verify' | 'audit' | 'playground' | 'stress' | 'bench', score: number): void {
  const session = ensureSession();
  if (type === 'verify') updateSession(session.id, { lastVerifyScore: score });
  else updateSession(session.id, { lastPlaygroundScore: score });
}

// IDENTITY_SEAL: PART-4 | role=auto-session | inputs=command | outputs=Session

// ============================================================
// PART 5 — Session Summary
// ============================================================

export function getSessionSummary(id?: string): string {
  const session = id ? loadSession(id) : getCurrentSession();
  if (!session) return '  세션 없음\n';

  const age = Date.now() - session.createdAt;
  const days = Math.floor(age / (24 * 60 * 60 * 1000));
  const hours = Math.floor((age % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((age % (60 * 60 * 1000)) / (60 * 1000));

  const lines: string[] = [
    `  📂 ${session.projectName}`,
    `  ID: ${session.id}`,
    `  기간: ${days > 0 ? days + '일 ' : ''}${hours > 0 ? hours + '시간 ' : ''}${minutes}분`,
    `  마지막: ${session.lastCommand}`,
    `  파일: ${session.openFiles.length}개`,
    `  영수증: ${session.receipts.length}개`,
  ];

  if (session.lastVerifyScore !== undefined) {
    lines.push(`  검증: ${session.lastVerifyScore}/100`);
  }
  if (session.lastPlaygroundScore !== undefined) {
    lines.push(`  벤치: ${session.lastPlaygroundScore}/100`);
  }

  return lines.join('\n');
}

// IDENTITY_SEAL: PART-5 | role=summary | inputs=id | outputs=string
