// ============================================================
// CS Quill 🦔 — cs sprint command
// ============================================================
// 목록 주면 순차 자동 생성. 게으름뱅이 딸칵.

import { runGenerate } from './generate';

// ============================================================
// PART 1 — Task Parser
// ============================================================

function parseTasks(input: string): string[] {
  return input
    .split(/\n|;/)
    .map(line => line.replace(/^\s*\d+[\.\)]\s*/, '').trim())
    .filter(line => line.length > 0);
}

// IDENTITY_SEAL: PART-1 | role=task-parser | inputs=string | outputs=string[]

// ============================================================
// PART 2 — Dependency Analysis
// ============================================================

/** Detect which tasks depend on others via keyword references */
function buildDependencyGraph(tasks: string[]): Map<number, number[]> {
  const deps = new Map<number, number[]>();
  for (let i = 0; i < tasks.length; i++) deps.set(i, []);

  // Simple heuristic: if task B mentions a keyword from task A and A comes before B,
  // then B likely depends on A
  const keywords = tasks.map(t =>
    t.toLowerCase().split(/[\s,;]+/).filter(w => w.length > 3)
  );

  for (let i = 1; i < tasks.length; i++) {
    const taskLower = tasks[i].toLowerCase();
    for (let j = 0; j < i; j++) {
      // Check if task i references keywords from task j
      const refs = keywords[j].filter(kw => taskLower.includes(kw) && kw.length > 4);
      if (refs.length >= 1) {
        deps.get(i)!.push(j);
      }
    }
  }
  return deps;
}

/** Group tasks into execution waves: tasks in the same wave can run in parallel */
function buildExecutionWaves(tasks: string[], deps: Map<number, number[]>): number[][] {
  const waves: number[][] = [];
  const completed = new Set<number>();

  while (completed.size < tasks.length) {
    const wave: number[] = [];
    for (let i = 0; i < tasks.length; i++) {
      if (completed.has(i)) continue;
      const taskDeps = deps.get(i) ?? [];
      if (taskDeps.every(d => completed.has(d))) {
        wave.push(i);
      }
    }
    if (wave.length === 0) {
      // Circular dependency fallback: add remaining sequentially
      for (let i = 0; i < tasks.length; i++) {
        if (!completed.has(i)) { wave.push(i); break; }
      }
    }
    waves.push(wave);
    for (const idx of wave) completed.add(idx);
  }
  return waves;
}

// IDENTITY_SEAL: PART-2 | role=dependency-analysis | inputs=tasks | outputs=waves

// ============================================================
// PART 3 — Sprint Runner
// ============================================================

export async function runSprint(tasksInput: string): Promise<void> {
  const tasks = parseTasks(tasksInput);

  if (tasks.length === 0) {
    console.log('  ⚠️  태스크가 없습니다.');
    console.log('  예: cs sprint "1. 로그인 API; 2. 회원가입; 3. JWT 미들웨어"');
    return;
  }

  const sprintStart = performance.now();
  console.log(`🦔 CS Quill — Sprint 모드 (${tasks.length}개 태스크)\n`);

  // Analyze dependencies and build execution waves
  const deps = buildDependencyGraph(tasks);
  const waves = buildExecutionWaves(tasks, deps);

  console.log('  태스크:');
  for (const [i, t] of tasks.entries()) {
    const taskDeps = deps.get(i) ?? [];
    const depInfo = taskDeps.length > 0 ? ` (→ ${taskDeps.map(d => d + 1).join(',')})` : '';
    console.log(`    ${i + 1}. ${t}${depInfo}`);
  }
  console.log(`\n  실행 계획: ${waves.length} wave(s) — ${waves.filter(w => w.length > 1).length} parallel wave(s)\n`);

  const results: Array<{ task: string; index: number; success: boolean; duration: number; wave: number; error?: string }> = [];
  let completedCount = 0;

  for (let waveIdx = 0; waveIdx < waves.length; waveIdx++) {
    const wave = waves[waveIdx];
    const isParallel = wave.length > 1;

    if (isParallel) {
      console.log(`  ── Wave ${waveIdx + 1} (${wave.length}개 병렬) ──`);
    }

    if (isParallel) {
      // Run independent tasks in parallel using Promise.all
      const wavePromises = wave.map(async (taskIdx) => {
        const task = tasks[taskIdx];
        const start = performance.now();
        console.log(`  [${taskIdx + 1}/${tasks.length}] ${task} ...`);
        try {
          await runGenerate(task, { mode: 'full', structure: 'auto' });
          return { task, index: taskIdx, success: true, duration: Math.round(performance.now() - start), wave: waveIdx };
        } catch (err) {
          return { task, index: taskIdx, success: false, duration: Math.round(performance.now() - start), wave: waveIdx, error: (err as Error).message };
        }
      });

      const waveResults = await Promise.all(wavePromises);
      for (const r of waveResults) {
        completedCount++;
        results.push(r);
        const pct = Math.round((completedCount / tasks.length) * 100);
        const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
        if (r.success) {
          console.log(`        ✅ ${r.task} (${r.duration}ms) [${bar}] ${pct}%`);
        } else {
          console.log(`        ❌ ${r.task}: ${r.error} [${bar}] ${pct}%`);
        }
      }
    } else {
      // Sequential execution for single-task waves
      for (const taskIdx of wave) {
        const task = tasks[taskIdx];
        const start = performance.now();
        console.log(`  [${taskIdx + 1}/${tasks.length}] ${task}`);
        try {
          await runGenerate(task, { mode: 'full', structure: 'auto' });
          completedCount++;
          const dur = Math.round(performance.now() - start);
          results.push({ task, index: taskIdx, success: true, duration: dur, wave: waveIdx });
          const pct = Math.round((completedCount / tasks.length) * 100);
          const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
          console.log(`        ✅ (${dur}ms) [${bar}] ${pct}%`);
        } catch (err) {
          completedCount++;
          const dur = Math.round(performance.now() - start);
          const errMsg = (err as Error).message;
          results.push({ task, index: taskIdx, success: false, duration: dur, wave: waveIdx, error: errMsg });
          console.log(`        ❌ 실패: ${errMsg}`);
        }
      }
    }
    console.log('');
  }

  // ── Enhanced Summary Report ──
  const totalDuration = Math.round(performance.now() - sprintStart);
  const seqDuration = results.reduce((s, r) => s + r.duration, 0);
  const successCount = results.filter(r => r.success).length;
  const failedResults = results.filter(r => !r.success);
  const avgDuration = results.length > 0 ? Math.round(seqDuration / results.length) : 0;
  const parallelSavings = seqDuration > totalDuration ? seqDuration - totalDuration : 0;

  console.log('  ═'.repeat(26));
  console.log('  📊 Sprint 리포트\n');
  console.log(`  ✅ 성공: ${successCount}/${tasks.length}`);
  if (failedResults.length > 0) {
    console.log(`  ❌ 실패: ${failedResults.length}/${tasks.length}`);
    for (const f of failedResults) {
      console.log(`     ${f.index + 1}. ${f.task}`);
      if (f.error) console.log(`        사유: ${f.error}`);
    }
  }
  console.log(`\n  ⏱  총 소요: ${Math.round(totalDuration / 1000)}초`);
  console.log(`  ⏱  평균/태스크: ${Math.round(avgDuration / 1000)}초`);
  if (parallelSavings > 1000) {
    console.log(`  ⚡ 병렬 절약: ${Math.round(parallelSavings / 1000)}초`);
  }
  console.log(`  📦 Wave: ${waves.length}개 (병렬 ${waves.filter(w => w.length > 1).length}개)`);

  // Performance ranking
  const sorted = [...results].filter(r => r.success).sort((a, b) => a.duration - b.duration);
  if (sorted.length >= 3) {
    console.log('\n  🏆 속도 랭킹:');
    for (let i = 0; i < Math.min(3, sorted.length); i++) {
      const medals = ['🥇', '🥈', '🥉'];
      console.log(`     ${medals[i]} ${sorted[i].task} (${Math.round(sorted[i].duration / 1000)}초)`);
    }
  }

  console.log('');
  try { const { recordCommand } = require('../core/session'); recordCommand(`sprint ${tasks.length}`); } catch {}
}

// IDENTITY_SEAL: PART-3 | role=sprint-runner | inputs=tasksInput | outputs=console
