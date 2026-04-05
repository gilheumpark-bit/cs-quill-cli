// @ts-nocheck
// ============================================================
// CS Quill 🦔 — cs bench command
// ============================================================
// 함수별 벤치마크. 베이스라인 저장 + 비교.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, _basename } from 'path';

// ============================================================
// PART 1 — Function Extractor
// ============================================================

interface FunctionInfo {
  name: string;
  line: number;
  length: number;
  isAsync: boolean;
  complexity: number;
}

function extractFunctions(code: string): FunctionInfo[] {
  const functions: FunctionInfo[] = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z_]\w*)\s*=>/);
    if (!match) continue;

    const name = match[1] || match[2];
    const isAsync = /async/.test(line);

    // Estimate function length (count lines until matching brace)
    let depth = 0;
    let started = false;
    let endLine = i;
    for (let j = i; j < lines.length; j++) {
      const opens = (lines[j].match(/\{/g) ?? []).length;
      const closes = (lines[j].match(/\}/g) ?? []).length;
      depth += opens - closes;
      if (opens > 0) started = true;
      if (started && depth <= 0) { endLine = j; break; }
    }

    // Estimate cyclomatic complexity
    const body = lines.slice(i, endLine + 1).join('\n');
    const complexity = (body.match(/\bif\b|\belse\b|\bcase\b|\b\?\s/g) ?? []).length + 1;

    functions.push({ name, line: i + 1, length: endLine - i + 1, isAsync, complexity });
  }

  return functions;
}

// IDENTITY_SEAL: PART-1 | role=function-extractor | inputs=code | outputs=FunctionInfo[]

// ============================================================
// PART 2 — Bench Runner
// ============================================================

interface BenchOptions {
  save?: string;
  compare?: string;
  failIfSlower?: string;
}

interface BenchResult {
  functions: Array<FunctionInfo & { score: number }>;
  timestamp: number;
}

export async function runBench(path: string, opts: BenchOptions): Promise<void> {
  console.log('🦔 CS Quill — 함수 벤치마크\n');

  let code: string;
  try {
    code = readFileSync(path, 'utf-8');
  } catch {
    console.log(`  ❌ 파일을 읽을 수 없습니다: ${path}`);
    return;
  }
  const functions = extractFunctions(code);

  if (functions.length === 0) {
    console.log('  ⚠️  함수를 찾을 수 없습니다.');
    return;
  }

  console.log(`  📄 ${path} — ${functions.length}개 함수\n`);

  // Score: 정적 분석 + 런타임 벤치마크 (tinybench)
  const scored = functions.map(fn => {
    let score = 100;
    if (fn.length > 50) score -= 10;
    if (fn.length > 100) score -= 15;
    if (fn.complexity > 10) score -= 20;
    if (fn.complexity > 20) score -= 20;
    if (fn.isAsync) score -= 5;
    return { ...fn, score: Math.max(0, score), opsPerSec: 0, avgMs: 0 };
  });

  // 런타임 벤치마크 (tinybench 연동)
  try {
    const { runTinybench } = await import('../adapters/perf-engine');
    const { runInVM } = await import('../adapters/sandbox');

    // 순수 함수만 벤치마크 (side-effect 없는 것)
    const benchable = scored.filter(fn => !fn.isAsync && fn.length < 30);
    if (benchable.length > 0) {
      console.log(`  ⚡ 런타임 벤치마크 (${benchable.length}개 함수)...\n`);
      const benchmarks = benchable.map(fn => {
        const fnCode = code.split('\n').slice(fn.line - 1, fn.line - 1 + fn.length).join('\n');
        return {
          name: fn.name,
          fn: () => { runInVM(`${fnCode}\n${fn.name}();`, { timeout: 500 }); },
        };
      });

      const results = await runTinybench(benchmarks);
      for (const r of results) {
        const target = scored.find(s => s.name === r.name);
        if (target) {
          target.opsPerSec = r.opsPerSec;
          target.avgMs = r.avgMs;
        }
      }
    }
  } catch { /* tinybench not available, static only */ }

  // Display
  console.log(`  ${'Function'.padEnd(24)} ${'Lines'.padStart(6)} ${'Cmplx'.padStart(6)} ${'Score'.padStart(6)}`);
  console.log('  ' + '─'.repeat(46));

  for (const fn of scored) {
    const icon = fn.score >= 80 ? '🟢' : fn.score >= 60 ? '🟡' : '🔴';
    console.log(`  ${icon} ${fn.name.padEnd(22)} ${fn.length.toString().padStart(6)} ${fn.complexity.toString().padStart(6)} ${fn.score.toString().padStart(5)}/100`);
  }

  const avgScore = Math.round(scored.reduce((s, f) => s + f.score, 0) / scored.length);
  console.log('  ' + '─'.repeat(46));
  console.log(`  평균: ${avgScore}/100`);

  // Worst function hint
  const worst = [...scored].sort((a, b) => a.score - b.score)[0];
  if (worst && worst.score < 70) {
    console.log(`\n  💡 ${worst.name}() (${worst.length}줄, 복잡도 ${worst.complexity}) 개선 추천`);
    if (worst.length > 50) console.log('     → 함수 분리 (PART 구조)');
    if (worst.complexity > 10) console.log('     → early return 패턴으로 중첩 줄이기');
  }
  console.log('');

  try { const { recordCommand } = await import('../core/session'); recordCommand(`bench ${path}`); } catch {}

  const result: BenchResult = { functions: scored, timestamp: Date.now() };

  // Save baseline
  if (opts.save) {
    const benchDir = join(process.cwd(), '.cs', 'bench');
    mkdirSync(benchDir, { recursive: true });
    writeFileSync(join(benchDir, `${opts.save}.json`), JSON.stringify(result, null, 2));
    console.log(`  📌 베이스라인 저장: ${opts.save}\n`);
  }

  // Compare with baseline
  if (opts.compare) {
    const benchPath = join(process.cwd(), '.cs', 'bench', `${opts.compare}.json`);
    if (!existsSync(benchPath)) {
      console.log(`  ⚠️  베이스라인 "${opts.compare}" 없음`);
      return;
    }

    const baseline: BenchResult = JSON.parse(readFileSync(benchPath, 'utf-8'));
    console.log(`  📊 vs ${opts.compare}:\n`);

    for (const fn of scored) {
      const base = baseline.functions.find(f => f.name === fn.name);
      if (!base) continue;

      const delta = fn.score - base.score;
      const icon = delta > 0 ? '🟢' : delta < 0 ? '🔴' : '⚪';
      const sign = delta > 0 ? '+' : '';
      console.log(`  ${icon} ${fn.name.padEnd(22)} ${base.score} → ${fn.score} (${sign}${delta})`);
    }

    const baseAvg = Math.round(baseline.functions.reduce((s, f) => s + f.score, 0) / baseline.functions.length);
    const diff = avgScore - baseAvg;
    console.log(`\n  전체: ${baseAvg} → ${avgScore} (${diff > 0 ? '+' : ''}${diff})`);

    if (opts.failIfSlower) {
      const threshold = parseInt(opts.failIfSlower, 10);
      if (diff < -threshold) {
        console.log(`  ❌ ${threshold}% 이상 저하 — FAIL`);
        process.exitCode = 1;
      }
    }
    console.log('');
  }
}

// IDENTITY_SEAL: PART-2 | role=bench-runner | inputs=path,opts | outputs=console
