// ============================================================
// CS Quill 🦔 — cs report command
// ============================================================
// 일일/팀 리포트. 영수증 기반 통계.

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import type { ReceiptData } from '../formatters/receipt';

// ============================================================
// PART 1 — Receipt Loader
// ============================================================

function loadReceipts(filter?: 'today' | 'week'): ReceiptData[] {
  const receiptDir = join(process.cwd(), '.cs', 'receipts');
  if (!existsSync(receiptDir)) return [];

  const files = readdirSync(receiptDir).filter(f => f.endsWith('.json'));
  const receipts: ReceiptData[] = [];

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const cutoff = filter === 'today' ? now - dayMs : filter === 'week' ? now - 7 * dayMs : 0;

  for (const file of files) {
    try {
      const data = JSON.parse(readFileSync(join(receiptDir, file), 'utf-8')) as ReceiptData;
      if (data.timestamp >= cutoff) receipts.push(data);
    } catch { /* skip corrupt */ }
  }

  return receipts.sort((a, b) => b.timestamp - a.timestamp);
}

// IDENTITY_SEAL: PART-1 | role=receipt-loader | inputs=filter | outputs=ReceiptData[]

// ============================================================
// PART 2 — Report Runner
// ============================================================

interface ReportOptions {
  today?: boolean;
  team?: boolean;
  week?: boolean;
}

export async function runReport(opts: ReportOptions): Promise<void> {
  const filter = opts.today ? 'today' : opts.week ? 'week' : 'today';
  const label = filter === 'today' ? '오늘' : '이번 주';

  console.log(`🦔 CS Quill — ${label}의 리포트\n`);

  const receipts = loadReceipts(filter);

  if (receipts.length === 0) {
    console.log('  📭 영수증이 없습니다. cs generate 또는 cs verify 실행 후 확인하세요.\n');
    return;
  }

  // Stats
  const totalGenerations = receipts.length;
  const passCount = receipts.filter(r => r.pipeline.overallStatus === 'pass').length;
  const passRate = Math.round((passCount / totalGenerations) * 100);
  const totalFixes = receipts.reduce((s, r) => s + r.verification.fixesApplied, 0);
  const avgScore = Math.round(receipts.reduce((s, r) => s + r.pipeline.overallScore, 0) / totalGenerations);

  console.log(`  생성:         ${totalGenerations}회`);
  console.log(`  통과율:       ${passRate}% (${passCount}/${totalGenerations})`);
  console.log(`  자동수정:     ${totalFixes}건`);
  console.log(`  평균 점수:    ${avgScore}/100`);

  // Most common issues (team scores)
  const teamScores = new Map<string, number[]>();
  for (const r of receipts) {
    for (const team of r.pipeline.teams) {
      const scores = teamScores.get(team.name) ?? [];
      scores.push(team.score);
      teamScores.set(team.name, scores);
    }
  }

  console.log('\n  팀별 평균:');
  for (const [name, scores] of teamScores) {
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const icon = avg >= 80 ? '✅' : avg >= 60 ? '⚠️' : '❌';
    console.log(`    ${icon} ${name.padEnd(14)} ${avg}/100`);
  }

  // Lowest scoring teams
  const sorted = [...teamScores.entries()]
    .map(([name, scores]) => ({ name, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) }))
    .sort((a, b) => a.avg - b.avg);

  if (sorted.length > 0 && sorted[0].avg < 80) {
    console.log(`\n  💡 개선 포인트: ${sorted[0].name} (${sorted[0].avg}/100) 이 가장 낮습니다.`);
  }

  // ── Trend Analysis ──
  if (receipts.length >= 2) {
    console.log('\n  📈 트렌드 분석:');

    // Split into recent half vs older half for comparison
    const midpoint = Math.floor(receipts.length / 2);
    const recentHalf = receipts.slice(0, midpoint);
    const olderHalf = receipts.slice(midpoint);

    const recentAvg = Math.round(recentHalf.reduce((s, r) => s + r.pipeline.overallScore, 0) / recentHalf.length);
    const olderAvg = Math.round(olderHalf.reduce((s, r) => s + r.pipeline.overallScore, 0) / olderHalf.length);
    const diff = recentAvg - olderAvg;
    const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
    const diffLabel = diff > 0 ? `+${diff}` : `${diff}`;
    console.log(`     전체 점수: ${olderAvg} → ${recentAvg} ${arrow} (${diffLabel})`);

    // Rolling average (window of 3)
    const windowSize = Math.min(3, receipts.length);
    const rollingScores: number[] = [];
    for (let i = 0; i <= receipts.length - windowSize; i++) {
      const window = receipts.slice(i, i + windowSize);
      rollingScores.push(Math.round(window.reduce((s, r) => s + r.pipeline.overallScore, 0) / windowSize));
    }
    if (rollingScores.length >= 2) {
      const latestRolling = rollingScores[0];
      const prevRolling = rollingScores[1];
      const rollingDiff = latestRolling - prevRolling;
      const rollingArrow = rollingDiff > 0 ? '↑' : rollingDiff < 0 ? '↓' : '→';
      console.log(`     이동평균(${windowSize}): ${latestRolling}/100 ${rollingArrow}`);
    }

    // Per-team trend
    const teamTrends = new Map<string, { recent: number[]; older: number[] }>();
    for (const r of recentHalf) {
      for (const t of r.pipeline.teams) {
        const entry = teamTrends.get(t.name) ?? { recent: [], older: [] };
        entry.recent.push(t.score);
        teamTrends.set(t.name, entry);
      }
    }
    for (const r of olderHalf) {
      for (const t of r.pipeline.teams) {
        const entry = teamTrends.get(t.name) ?? { recent: [], older: [] };
        entry.older.push(t.score);
        teamTrends.set(t.name, entry);
      }
    }

    const trendLines: string[] = [];
    for (const [name, data] of teamTrends) {
      if (data.recent.length === 0 || data.older.length === 0) continue;
      const rAvg = Math.round(data.recent.reduce((a, b) => a + b, 0) / data.recent.length);
      const oAvg = Math.round(data.older.reduce((a, b) => a + b, 0) / data.older.length);
      const d = rAvg - oAvg;
      const a = d > 0 ? '↑' : d < 0 ? '↓' : '→';
      trendLines.push(`     ${a} ${name.padEnd(14)} ${oAvg} → ${rAvg}`);
    }
    if (trendLines.length > 0) {
      console.log('     팀별 변화:');
      for (const line of trendLines) console.log(line);
    }

    // Pass rate trend
    const recentPassRate = Math.round(recentHalf.filter(r => r.pipeline.overallStatus === 'pass').length / recentHalf.length * 100);
    const olderPassRate = Math.round(olderHalf.filter(r => r.pipeline.overallStatus === 'pass').length / olderHalf.length * 100);
    const prDiff = recentPassRate - olderPassRate;
    const prArrow = prDiff > 0 ? '↑' : prDiff < 0 ? '↓' : '→';
    console.log(`     통과율: ${olderPassRate}% → ${recentPassRate}% ${prArrow}`);
  }

  // Cost tracking
  try {
    const { formatCostSummary } = require('../core/cost-tracker');
    console.log(`\n${formatCostSummary()}`);
  } catch {}

  // Fix Memory stats
  try {
    const { getStats } = require('../core/fix-memory');
    const fixStats = getStats();
    if (fixStats.total > 0) {
      console.log(`\n  🧠 Fix Memory:`);
      console.log(`     패턴 ${fixStats.total}개 | 평균 신뢰도 ${Math.round(fixStats.avgConfidence * 100)}%`);
      for (const cat of fixStats.topCategories.slice(0, 3)) {
        console.log(`     ${cat.category}: ${cat.count}회`);
      }
    }
  } catch {}

  // Badge check
  try {
    const { evaluateBadges } = require('../core/badges');
    const { newBadges, allEarned } = evaluateBadges();
    if (allEarned.length > 0) {
      console.log(`\n  🏆 뱃지: ${allEarned.length}개 획득`);
    }
    if (newBadges.length > 0) {
      for (const b of newBadges) console.log(`     🆕 ${b.icon} ${b.name}`);
    }
  } catch {}

  console.log('');
}

// IDENTITY_SEAL: PART-2 | role=report-runner | inputs=opts | outputs=console
