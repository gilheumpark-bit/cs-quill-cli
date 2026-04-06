// @ts-nocheck — external library wrapper, types handled at runtime
// ============================================================
// CS Quill 🦔 — cs stress command
// ============================================================
// 실측 부하 테스트. 웹의 가상 시뮬레이션이 아닌 실제 실행.
// Phase 1: 정적 메트릭 (로컬) → Phase 2: 실측 (autocannon) → Phase 3: AI 분석

import { readFileSync, statSync } from 'fs';
import { _extname } from 'path';

// ============================================================
// PART 1 — Static Metrics (from stress-test.ts)
// ============================================================

interface StaticMetrics {
  totalLines: number;
  functionCount: number;
  nestedLoopDepth: number;
  asyncWithoutTryCatch: number;
  fetchCallCount: number;
  eventListenerCount: number;
  recursiveFunctionCount: number;
  cyclomaticEstimate: number;
}

function computeStaticMetrics(code: string): StaticMetrics {
  const lines = code.split('\n');

  const functionCount = (code.match(/(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z_]\w*)\s*=>)/g) ?? []).length;

  let maxLoopDepth = 0;
  let currentLoopDepth = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\s*(?:for\s*\(|while\s*\(|\.forEach\(|\.map\()/.test(trimmed)) {
      currentLoopDepth++;
      if (currentLoopDepth > maxLoopDepth) maxLoopDepth = currentLoopDepth;
    }
    const opens = (trimmed.match(/\{/g) ?? []).length;
    const closes = (trimmed.match(/\}/g) ?? []).length;
    if (closes > opens && currentLoopDepth > 0) currentLoopDepth -= Math.min(closes - opens, currentLoopDepth);
  }

  let asyncWithoutTryCatch = 0;
  let inTry = 0;
  for (const line of lines) {
    if (line.includes('try')) inTry++;
    if (line.includes('}') && inTry > 0) inTry--;
    if (/\bawait\b/.test(line) && inTry === 0) asyncWithoutTryCatch++;
  }

  const fetchCallCount = (code.match(/\bfetch\s*\(|axios\.|\.get\s*\(|\.post\s*\(/g) ?? []).length;
  const eventListenerCount = (code.match(/addEventListener|\.on\s*\(/g) ?? []).length;

  const fnNames = (code.match(/function\s+(\w+)/g) ?? []).map(m => m.replace('function ', ''));
  let recursiveFunctionCount = 0;
  for (const name of fnNames) {
    const bodyMatch = new RegExp(`function\\s+${name}[^}]*\\{([\\s\\S]*?)\\n\\}`, 'm').exec(code);
    if (bodyMatch?.[1]?.includes(name + '(')) recursiveFunctionCount++;
  }

  const cyclomaticEstimate = (code.match(/\bif\b|\belse\b|\bswitch\b|\bcase\b|\b\?\s*[^:]/g) ?? []).length;

  return {
    totalLines: lines.length, functionCount, nestedLoopDepth: maxLoopDepth,
    asyncWithoutTryCatch, fetchCallCount, eventListenerCount,
    recursiveFunctionCount, cyclomaticEstimate,
  };
}

// IDENTITY_SEAL: PART-1 | role=static-metrics | inputs=code | outputs=StaticMetrics

// ============================================================
// PART 2 — Stress Runner
// ============================================================

interface StressOptions {
  scenario?: string;
  users: string;
  duration: string;
}

export async function runStress(path: string, opts: StressOptions): Promise<void> {
  console.log('🦔 CS Quill — 스트레스 테스트\n');

  // Read target file(s)
  const stat = statSync(path);
  let code: string;
  if (stat.isFile()) {
    code = readFileSync(path, 'utf-8');
  } else {
    console.log('  ⚠️  디렉토리 스트레스 테스트는 단일 파일을 지정하세요.');
    console.log('  예: cs stress ./src/api/auth.ts');
    return;
  }

  const startTime = performance.now();

  // Phase 1: Static metrics
  console.log('  [Phase 1] 정적 메트릭 분석...');
  const metrics = computeStaticMetrics(code);

  const warnings: string[] = [];
  if (metrics.nestedLoopDepth >= 2) warnings.push(`⚠️  O(n^${metrics.nestedLoopDepth}) 중첩 루프`);
  if (metrics.asyncWithoutTryCatch > 0) warnings.push(`⚠️  try-catch 없는 await ${metrics.asyncWithoutTryCatch}건`);
  if (metrics.eventListenerCount > 3) warnings.push(`⚠️  addEventListener ${metrics.eventListenerCount}건 — 메모리 릭 위험`);
  if (metrics.recursiveFunctionCount > 0) warnings.push(`⚠️  재귀 함수 ${metrics.recursiveFunctionCount}건`);
  if (metrics.cyclomaticEstimate > 20) warnings.push(`⚠️  복잡도 ${metrics.cyclomaticEstimate} — 고복잡`);

  console.log(`        Lines: ${metrics.totalLines} | Functions: ${metrics.functionCount}`);
  console.log(`        Loop depth: ${metrics.nestedLoopDepth} | Cyclomatic: ${metrics.cyclomaticEstimate}`);
  console.log(`        Fetch: ${metrics.fetchCallCount} | Async unguarded: ${metrics.asyncWithoutTryCatch}`);
  console.log(`        EventListeners: ${metrics.eventListenerCount} | Recursive: ${metrics.recursiveFunctionCount}`);

  // 정적 등급 산출
  const staticScore = Math.max(0, 100
    - metrics.nestedLoopDepth * 15
    - metrics.asyncWithoutTryCatch * 10
    - metrics.eventListenerCount * 5
    - metrics.recursiveFunctionCount * 10
    - (metrics.cyclomaticEstimate > 20 ? 20 : metrics.cyclomaticEstimate > 10 ? 10 : 0));
  const staticGrade = staticScore >= 80 ? '🟢 A' : staticScore >= 60 ? '🟡 B' : staticScore >= 40 ? '🟠 C' : '🔴 D';
  console.log(`\n        정적 등급: ${staticGrade} (${staticScore}/100)`);

  if (warnings.length > 0) {
    console.log('');
    for (const w of warnings) console.log(`        ${w}`);
  }

  // Phase 2: 실측 부하 테스트 (autocannon) 또는 AI 시뮬레이션
  const targetUrl = (opts as any).url as string | undefined;
  if (targetUrl) {
    console.log(`\n  [Phase 2] 🔥 실측 부하 테스트 (autocannon → ${targetUrl})...`);
    try {
      const { runAutocannon } = require('../adapters/perf-engine');
      const result = await runAutocannon(targetUrl, {
        connections: parseInt(opts.users, 10) || 10,
        duration: parseInt(opts.duration, 10) || 10,
      });
      console.log(`        RPS: ${result.rps} | Latency avg: ${result.latencyAvg}ms`);
      console.log(`        p50: ${result.latencyP50}ms | p95: ${result.latencyP95}ms | p99: ${result.latencyP99}ms`);
      console.log(`        Errors: ${result.errors} | Timeouts: ${result.timeouts} | Total: ${result.totalRequests}`);
      const grade = result.latencyP95 < 100 ? '🟢 A' : result.latencyP95 < 500 ? '🟡 B' : result.latencyP95 < 2000 ? '🟠 C' : '🔴 D';
      console.log(`        Grade: ${grade}`);
    } catch (e) {
      console.log(`        ❌ autocannon 실패: ${(e as Error).message}`);
    }
  } else {
    console.log('\n  [Phase 2] 실측 동시 실행 테스트... (--url <endpoint>로 HTTP 부하 테스트 가능)');

    // Real concurrent execution: require() the target file and measure actual execution
    const concurrency = parseInt(opts.users, 10) || 10;
    const iterations = parseInt(opts.duration, 10) || 50;

    let targetFn: ((...args: any[]) => any) | null = null;
    let fnName = '<module>';

    // Try to require the target and find an exported function to benchmark
    try {
      const resolved = require('path').resolve(path);
      const targetModule = require(resolved);
      // Pick first exported function
      const exportKeys = Object.keys(targetModule).filter(k => typeof targetModule[k] === 'function');
      if (exportKeys.length > 0) {
        fnName = exportKeys[0];
        targetFn = targetModule[fnName];
      }
    } catch { /* file may not be directly require-able */ }

    if (targetFn) {
      console.log(`        대상 함수: ${fnName} | 동시성: ${concurrency} | 반복: ${iterations}`);

      const timings: number[] = [];
      let errors = 0;

      // Run batches of concurrent calls
      const batchCount = Math.ceil(iterations / concurrency);
      for (let batch = 0; batch < batchCount; batch++) {
        const batchSize = Math.min(concurrency, iterations - batch * concurrency);
        const promises = [];
        for (let i = 0; i < batchSize; i++) {
          promises.push((async () => {
            const t0 = performance.now();
            try {
              await targetFn!();
            } catch {
              errors++;
            }
            return performance.now() - t0;
          })());
        }
        const batchTimings = await Promise.all(promises);
        timings.push(...batchTimings);
      }

      // Compute percentiles
      timings.sort((a, b) => a - b);
      const avg = Math.round(timings.reduce((a, b) => a + b, 0) / timings.length * 100) / 100;
      const p50 = timings[Math.floor(timings.length * 0.5)];
      const p95 = timings[Math.floor(timings.length * 0.95)];
      const p99 = timings[Math.floor(timings.length * 0.99)];
      const minT = timings[0];
      const maxT = timings[timings.length - 1];
      const errorRate = errors / timings.length;
      const totalTime = timings.reduce((a, b) => a + b, 0);
      const throughput = Math.round(timings.length / (totalTime / 1000 / concurrency) * 100) / 100;

      console.log(`        Avg: ${avg.toFixed(2)}ms | Min: ${minT.toFixed(2)}ms | Max: ${maxT.toFixed(2)}ms`);
      console.log(`        p50: ${p50.toFixed(2)}ms | p95: ${p95.toFixed(2)}ms | p99: ${p99.toFixed(2)}ms`);
      console.log(`        Errors: ${errors}/${timings.length} (${(errorRate * 100).toFixed(1)}%)`);
      console.log(`        Throughput: ~${throughput} ops/s (동시 ${concurrency})`);

      const execGrade = p95 < 1 ? '🟢 A' : p95 < 10 ? '🟡 B' : p95 < 100 ? '🟠 C' : '🔴 D';
      console.log(`        실행 등급: ${execGrade}`);

      // Recommendations based on real measurements
      const recs: string[] = [];
      if (p99 > p95 * 3) recs.push('p99 지연이 p95의 3배 이상 — 일부 호출에서 극단적 지연 발생');
      if (errorRate > 0.05) recs.push(`에러율 ${(errorRate * 100).toFixed(1)}% — 안정성 점검 필요`);
      if (maxT > avg * 10) recs.push('최대 지연이 평균의 10배 이상 — 특이값 원인 조사 필요');
      if (avg > 50) recs.push('평균 실행시간 50ms 초과 — 최적화 검토');
      if (recs.length > 0) {
        console.log('\n        💡 실측 기반 권장사항:');
        for (const rec of recs) console.log(`           - ${rec}`);
      }
    } else {
      // Cannot require the file -- fall back to static-only analysis with code parsing benchmark
      console.log('        대상 파일에서 export 함수를 찾을 수 없음. 코드 파싱 벤치마크로 대체.');

      const parseTimings: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const t0 = performance.now();
        // Measure real work: re-compute static metrics as benchmark
        computeStaticMetrics(code);
        parseTimings.push(performance.now() - t0);
      }
      parseTimings.sort((a, b) => a - b);
      const avg = Math.round(parseTimings.reduce((a, b) => a + b, 0) / parseTimings.length * 100) / 100;
      const p95 = parseTimings[Math.floor(parseTimings.length * 0.95)];
      console.log(`        정적분석 반복 ${iterations}회: avg ${avg.toFixed(2)}ms | p95 ${p95.toFixed(2)}ms`);
    }
  } // close else (no --url)

  const duration = Math.round(performance.now() - startTime);

  // Quick fix suggestions based on static metrics
  if (warnings.length > 0) {
    console.log('\n  🔧 빠른 수정:');
    if (metrics.nestedLoopDepth >= 2) console.log('     → 중첩 루프를 Map/Set 조회로 교체');
    if (metrics.asyncWithoutTryCatch > 0) console.log('     → 미보호 await에 try-catch 추가');
    if (metrics.eventListenerCount > 3) console.log('     → removeEventListener 또는 AbortController 사용');
    if (metrics.recursiveFunctionCount > 0) console.log('     → 재귀에 depth limit 추가');
  }

  try { const { recordCommand } = require('../core/session'); recordCommand(`stress ${path}`); } catch {}
  console.log(`\n  완료: ${duration}ms\n`);
}

// IDENTITY_SEAL: PART-2 | role=stress-runner | inputs=path,opts | outputs=console
