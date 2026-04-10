// ============================================================
// CS Quill 🦔 — Badge & Challenge System
// ============================================================
// 게이미피케이션: 뱃지 + 챌린지 + 공유 카드.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { getGlobalConfigDir } from './config';
import type { ReceiptData } from '../formatters/receipt';

// ============================================================
// PART 1 — Badge Definitions
// ============================================================

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  condition: (ctx: BadgeContext) => boolean;
}

export interface Challenge {
  id: string;
  name: string;
  icon: string;
  description: string;
  goal: string;
  check: (ctx: BadgeContext) => { progress: number; total: number };
}

export interface BadgeContext {
  receipts: ReceiptData[];
  totalGenerations: number;
  passRate: number;
  avgScore: number;
  consecutivePasses: number;
  hollowCount: number;
  maxScore: number;
  speedFixes: number;
}

export const BADGES: Badge[] = [
  { id: 'first-blood', name: 'First Blood', icon: '✨', description: '첫 벤치마크 완료', condition: ctx => ctx.totalGenerations >= 1 },
  { id: 'guardian', name: 'Guardian', icon: '🛡️', description: 'Shield 90+ 달성', condition: ctx => ctx.receipts.some(r => (r.pipeline.teams.find(t => t.name === 'release-ip')?.score ?? 0) >= 90) },
  { id: 'clean-code', name: 'Clean Code', icon: '🧹', description: '빈깡통 0 달성', condition: ctx => ctx.hollowCount === 0 && ctx.totalGenerations >= 3 },
  { id: 'speed-demon', name: 'Speed Demon', icon: '⚡', description: '3초 이내 수정 10회', condition: ctx => ctx.speedFixes >= 10 },
  { id: 'top-10', name: 'Top 10%', icon: '🔥', description: '글로벌 상위 10%', condition: ctx => ctx.maxScore >= 9000 },
  { id: 'improver', name: 'Improver', icon: '📈', description: '점수 +20 개선', condition: ctx => {
    if (ctx.receipts.length < 2) return false;
    const first = ctx.receipts[ctx.receipts.length - 1].pipeline.overallScore;
    const last = ctx.receipts[0].pipeline.overallScore;
    return last - first >= 20;
  }},
  { id: 'streak-5', name: 'Clean Streak', icon: '🎯', description: '5회 연속 통과', condition: ctx => ctx.consecutivePasses >= 5 },
  { id: 'streak-10', name: 'Perfect Streak', icon: '💎', description: '10회 연속 통과', condition: ctx => ctx.consecutivePasses >= 10 },
  { id: 'centurion', name: 'Centurion', icon: '💯', description: '100회 생성', condition: ctx => ctx.totalGenerations >= 100 },
  { id: 'perfect', name: 'Perfect Score', icon: '🌟', description: '종합 95+ 달성', condition: ctx => ctx.maxScore >= 95 },
  { id: 'marathon', name: 'Marathon', icon: '🏃', description: '50회 생성', condition: ctx => ctx.totalGenerations >= 50 },
  { id: 'iron-wall', name: 'Iron Wall', icon: '🧱', description: '검증 통과율 95%+', condition: ctx => ctx.passRate >= 0.95 && ctx.totalGenerations >= 10 },
  { id: 'zero-bug', name: 'Zero Bug', icon: '🐛', description: '검증 발견 0건 3회 연속', condition: ctx => {
    return ctx.receipts.slice(0, 3).every(r => r.pipeline.teams.every(t => t.findings === 0));
  }},
  { id: 'polyglot', name: 'Polyglot', icon: '🌍', description: '3개+ 언어 프로젝트', condition: () => false /* needs project scan */ },
  { id: 'night-owl', name: 'Night Owl', icon: '🦉', description: '새벽 2-5시 코딩', condition: () => { const h = new Date().getHours(); return h >= 2 && h <= 5; }},
];

export const CHALLENGES: Challenge[] = [
  {
    id: 'zero-hollow', name: 'Zero Hollow', icon: '🕳️',
    description: '빈깡통 0개로 프로젝트 유지', goal: '🦔 Gold Badge',
    check: ctx => ({ progress: ctx.hollowCount === 0 ? 1 : 0, total: 1 }),
  },
  {
    id: 'speed-demon', name: 'Speed Demon', icon: '⚡',
    description: '평균 점수 90+ 달성', goal: '⚡ Turbo Badge',
    check: ctx => ({ progress: Math.min(ctx.avgScore, 90), total: 90 }),
  },
  {
    id: 'fort-knox', name: 'Fort Knox', icon: '🔒',
    description: 'Shield 95+ 7일 유지', goal: '🛡️ Security Badge',
    check: ctx => {
      const shieldScores = ctx.receipts.slice(0, 7).map(r => r.pipeline.teams.find(t => t.name === 'release-ip')?.score ?? 0);
      const passing = shieldScores.filter(s => s >= 95).length;
      return { progress: passing, total: 7 };
    },
  },
  {
    id: 'clean-streak', name: 'Clean Streak', icon: '🧹',
    description: '검증 통과율 100% 10회 연속', goal: '✨ Perfect Badge',
    check: ctx => ({ progress: Math.min(ctx.consecutivePasses, 10), total: 10 }),
  },
];

// IDENTITY_SEAL: PART-1 | role=definitions | inputs=none | outputs=BADGES,CHALLENGES

// ============================================================
// PART 2 — Badge Evaluator
// ============================================================

interface UserBadges {
  earned: Array<{ id: string; earnedAt: number }>;
}

function getBadgePath(): string {
  return join(getGlobalConfigDir(), 'badges.json');
}

function loadUserBadges(): UserBadges {
  const path = getBadgePath();
  if (!existsSync(path)) return { earned: [] };
  try { return JSON.parse(readFileSync(path, 'utf-8')); } catch { return { earned: [] }; }
}

function saveUserBadges(badges: UserBadges): void {
  mkdirSync(getGlobalConfigDir(), { recursive: true });
  writeFileSync(getBadgePath(), JSON.stringify(badges, null, 2));
}

export function buildBadgeContext(): BadgeContext {
  const receiptDir = join(process.cwd(), '.cs', 'receipts');
  const receipts: ReceiptData[] = [];

  if (existsSync(receiptDir)) {
    for (const f of readdirSync(receiptDir).filter(f => f.endsWith('.json')).sort().reverse()) {
      try { receipts.push(JSON.parse(readFileSync(join(receiptDir, f), 'utf-8'))); } catch { /* skip */ }
    }
  }

  let consecutivePasses = 0;
  for (const r of receipts) {
    if (r.pipeline.overallStatus === 'pass') consecutivePasses++;
    else break;
  }

  return {
    receipts,
    totalGenerations: receipts.length,
    passRate: receipts.length > 0 ? receipts.filter(r => r.pipeline.overallStatus === 'pass').length / receipts.length : 0,
    avgScore: receipts.length > 0 ? Math.round(receipts.reduce((s, r) => s + r.pipeline.overallScore, 0) / receipts.length) : 0,
    consecutivePasses,
    hollowCount: 0, // Would need hollow scan data
    maxScore: receipts.length > 0 ? Math.max(...receipts.map(r => r.pipeline.overallScore)) : 0,
  };
}

export function evaluateBadges(): { newBadges: Badge[]; allEarned: string[] } {
  const ctx = buildBadgeContext();
  const userBadges = loadUserBadges();
  const earnedIds = new Set(userBadges.earned.map(b => b.id));
  const newBadges: Badge[] = [];

  for (const badge of BADGES) {
    if (earnedIds.has(badge.id)) continue;
    if (badge.condition(ctx)) {
      newBadges.push(badge);
      userBadges.earned.push({ id: badge.id, earnedAt: Date.now() });
    }
  }

  if (newBadges.length > 0) saveUserBadges(userBadges);

  return { newBadges, allEarned: userBadges.earned.map(b => b.id) };
}

export function evaluateChallenges(): Array<{ challenge: Challenge; progress: number; total: number }> {
  const ctx = buildBadgeContext();
  return CHALLENGES.map(c => ({ challenge: c, ...c.check(ctx) }));
}

// ============================================================
// PART 3 — Share Card (ASCII)
// ============================================================

export function generateShareCard(projectName: string, score: number, badges: string[]): string {
  const grade = score >= 95 ? 'S' : score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : 'D';
  const badgeStr = badges.length > 0 ? badges.slice(0, 5).join(' ') : 'none yet';

  return [
    '┌─────────────────────────────────┐',
    '│  🦔 CS Quill Benchmark          │',
    `│  ${projectName.padEnd(20)} Score: ${score.toString().padStart(3)} │`,
    `│  Grade: ${grade}    Badges: ${badgeStr.padEnd(14)}│`,
    '└─────────────────────────────────┘',
  ].join('\n');
}

export function generateReadmeBadge(projectName: string, score: number): string {
  const color = score >= 85 ? 'brightgreen' : score >= 70 ? 'yellow' : score >= 55 ? 'orange' : 'red';
  return `![CS Score](https://img.shields.io/badge/CS_Quill-${score}%2F100-${color})`;
}

// IDENTITY_SEAL: PART-3 | role=share | inputs=score,badges | outputs=string
