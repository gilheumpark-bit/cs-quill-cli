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
      const { runAutocannon } = await import('../adapters/perf-engine');
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
    console.log('\n  [Phase 2] AI 가상 시뮬레이션... (--url <endpoint>로 실측 가능)');

  try {
    const { analyzeStress, getScenarios } = await import('../core/pipeline-bridge');
    const scenarios = getScenarios();
    const targetScenario = opts.scenario
      ? scenarios.find(s => s.id.includes(opts.scenario!) || s.type === opts.scenario)
      : scenarios[0];

    if (!targetScenario) {
      console.log('        ⚠️  시나리오를 찾을 수 없습니다.');
      console.log('        사용 가능: ' + scenarios.map(s => s.id).join(', '));
    } else {
      const result = await analyzeStress(code, path, targetScenario);
      const gradeIcon = result.grade === 'A' ? '🟢' : result.grade === 'B' ? '🟡' : result.grade === 'C' ? '🟠' : '🔴';

      console.log(`        Scenario: ${targetScenario.name} (${targetScenario.virtualUsers} users, ${targetScenario.durationSec}s)`);
      console.log(`        Avg: ${result.metrics.avgResponseMs}ms | p95: ${result.metrics.p95Ms}ms | p99: ${result.metrics.p99Ms}ms`);
      console.log(`        Error rate: ${(result.metrics.errorRate * 100).toFixed(2)}%`);
      console.log(`        Throughput: ${result.metrics.throughputRps} RPS`);
      console.log(`        ${gradeIcon} Grade: ${result.grade}`);

      if (result.breakingPoint) {
        console.log(`        💥 Breaking point: ${result.breakingPoint.virtualUsers} users`);
      }

      if (result.recommendations.length > 0) {
        console.log('\n        💡 Recommendations:');
        for (const rec of result.recommendations.slice(0, 5)) {
          console.log(`           - ${rec}`);
        }
      }
    }
  } catch {
    console.log('        ⚠️  AI 시뮬레이션 스킵 (API 키 없음 또는 네트워크 오류)');
    console.log('        정적 메트릭만 표시합니다.');
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

  try { const { recordCommand } = await import('../core/session'); recordCommand(`stress ${path}`); } catch {}
  console.log(`\n  완료: ${duration}ms\n`);
}

// IDENTITY_SEAL: PART-2 | role=stress-runner | inputs=path,opts | outputs=console
