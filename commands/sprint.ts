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
// PART 2 — Sprint Runner
// ============================================================

export async function runSprint(tasksInput: string): Promise<void> {
  const tasks = parseTasks(tasksInput);

  if (tasks.length === 0) {
    console.log('  ⚠️  태스크가 없습니다.');
    console.log('  예: cs sprint "1. 로그인 API; 2. 회원가입; 3. JWT 미들웨어"');
    return;
  }

  console.log(`🦔 CS Quill — Sprint 모드 (${tasks.length}개 태스크)\n`);
  console.log('  태스크:');
  for (const [i, t] of tasks.entries()) console.log(`    ${i + 1}. ${t}`);
  console.log('');

  const results: Array<{ task: string; success: boolean; duration: number }> = [];

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const start = performance.now();

    console.log(`  [${ i + 1}/${tasks.length}] ${task}`);

    try {
      await runGenerate(task, { mode: 'full', structure: 'auto' });
      results.push({ task, success: true, duration: Math.round(performance.now() - start) });
    } catch (err) {
      console.log(`        ❌ 실패: ${(err as Error).message}`);
      results.push({ task, success: false, duration: Math.round(performance.now() - start) });
    }

    console.log('');
  }

  // Summary
  const totalDuration = results.reduce((s, r) => s + r.duration, 0);
  const successCount = results.filter(r => r.success).length;

  console.log('  ─'.repeat(26));
  console.log(`  🦔 Sprint 완료: ${successCount}/${tasks.length} 성공 (${Math.round(totalDuration / 1000)}초)`);
  if (successCount < tasks.length) {
    const failed = results.filter(r => !r.success);
    console.log(`\n  ❌ 실패 ${failed.length}건:`);
    for (const f of failed) console.log(`     - ${f.task}`);
  }
  console.log('');
  try { const { recordCommand } = await import('../core/session'); recordCommand(`sprint ${tasks.length}`); } catch {}
}

// IDENTITY_SEAL: PART-2 | role=sprint-runner | inputs=tasksInput | outputs=console
