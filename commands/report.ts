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
