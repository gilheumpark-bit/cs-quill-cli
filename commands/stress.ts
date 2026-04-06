// @ts-nocheck — external library wrapper, types handled at runtime
// ============================================================
// CS Quill — cs stress command
// ============================================================
// 실측 부하 테스트. 웹의 가상 시뮬레이션이 아닌 실제 실행.
// Phase 1: 정적 메트릭 (로컬)
// Phase 2: 실측 (worker_threads CPU / memory / I/O / HTTP)
// Phase 3: 결과 보고 (ASCII chart, baseline comparison)

const fs = require('fs');
const path = require('path');

// ============================================================
// PART 1 — Static Metrics
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

  const fnNames = (code.match(/function\s+(\w+)/g) ?? []).map((m: string) => m.replace('function ', ''));
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
// PART 2 — Stress Profiles
// ============================================================

interface StressProfile {
  name: string;
  concurrency: number;
  iterations: number;
  description: string;
}

const STRESS_PROFILES: Record<string, StressProfile> = {
  light:  { name: 'light',  concurrency: 10,  iterations: 50,   description: 'Light load (10 concurrent, 50 iterations)' },
  medium: { name: 'medium', concurrency: 50,  iterations: 200,  description: 'Medium load (50 concurrent, 200 iterations)' },
  heavy:  { name: 'heavy',  concurrency: 200, iterations: 1000, description: 'Heavy load (200 concurrent, 1000 iterations)' },
};

function resolveProfile(opts: StressOptions): StressProfile {
  const profileName = (opts.profile ?? '').toLowerCase();
  if (STRESS_PROFILES[profileName]) return STRESS_PROFILES[profileName];
  // Fall back to manual values
  return {
    name: 'custom',
    concurrency: parseInt(opts.users, 10) || 10,
    iterations: parseInt(opts.duration, 10) || 50,
    description: `Custom (${opts.users} concurrent, ${opts.duration} iterations)`,
  };
}

// IDENTITY_SEAL: PART-2 | role=profiles | inputs=opts | outputs=StressProfile

// ============================================================
// PART 3 — ASCII Bar Chart
// ============================================================

function renderLatencyChart(timings: number[], bucketCount: number = 10): string[] {
  if (timings.length === 0) return ['  (no data)'];
  const sorted = [...timings].sort((a, b) => a - b);
  const minVal = sorted[0];
  const maxVal = sorted[sorted.length - 1];
  const range = maxVal - minVal || 1;
  const bucketSize = range / bucketCount;

  const buckets: number[] = new Array(bucketCount).fill(0);
  for (const t of sorted) {
    const idx = Math.min(Math.floor((t - minVal) / bucketSize), bucketCount - 1);
    buckets[idx]++;
  }

  const maxCount = Math.max(...buckets);
  const barMaxWidth = 30;
  const lines: string[] = [];
  lines.push('        Latency Distribution:');

  for (let i = 0; i < bucketCount; i++) {
    const lo = (minVal + i * bucketSize).toFixed(1);
    const hi = (minVal + (i + 1) * bucketSize).toFixed(1);
    const count = buckets[i];
    const barLen = maxCount > 0 ? Math.round((count / maxCount) * barMaxWidth) : 0;
    const bar = '#'.repeat(barLen);
    const label = `${lo.padStart(8)}-${hi.padEnd(8)}ms`;
    lines.push(`        ${label} |${bar} (${count})`);
  }
  return lines;
}

// IDENTITY_SEAL: PART-3 | role=chart | inputs=timings | outputs=string[]

// ============================================================
// PART 4 — Baseline Comparison
// ============================================================

interface BaselineData {
  timestamp: number;
  profile: string;
  file: string;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  errorRate: number;
  throughput: number;
  memPeakMB: number;
}

function getBaselinePath(targetPath: string): string {
  const dir = path.dirname(targetPath);
  return path.join(dir, '.cs-stress-baseline.json');
}

function loadBaseline(targetPath: string): BaselineData | null {
  try {
    const bPath = getBaselinePath(targetPath);
    if (fs.existsSync(bPath)) {
      const raw = fs.readFileSync(bPath, 'utf-8');
      return JSON.parse(raw) as BaselineData;
    }
  } catch { /* no baseline */ }
  return null;
}

function saveBaseline(targetPath: string, data: BaselineData): void {
  try {
    const bPath = getBaselinePath(targetPath);
    fs.writeFileSync(bPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch { /* skip save */ }
}

function renderComparison(current: BaselineData, baseline: BaselineData): string[] {
  const lines: string[] = [];
  lines.push('        Baseline Comparison:');

  const fmt = (label: string, cur: number, prev: number, unit: string, lowerBetter: boolean) => {
    const delta = cur - prev;
    const pct = prev !== 0 ? ((delta / prev) * 100).toFixed(1) : 'N/A';
    const arrow = delta < 0
      ? (lowerBetter ? ' [IMPROVED]' : ' [REGRESSED]')
      : delta > 0
        ? (lowerBetter ? ' [REGRESSED]' : ' [IMPROVED]')
        : ' [SAME]';
    return `        ${label.padEnd(14)} ${prev.toFixed(2)}${unit} -> ${cur.toFixed(2)}${unit} (${delta >= 0 ? '+' : ''}${pct}%)${arrow}`;
  };

  lines.push(fmt('Avg latency', current.avgMs, baseline.avgMs, 'ms', true));
  lines.push(fmt('p95 latency', current.p95Ms, baseline.p95Ms, 'ms', true));
  lines.push(fmt('p99 latency', current.p99Ms, baseline.p99Ms, 'ms', true));
  lines.push(fmt('Error rate', current.errorRate * 100, baseline.errorRate * 100, '%', true));
  lines.push(fmt('Throughput', current.throughput, baseline.throughput, ' ops/s', false));
  lines.push(fmt('Mem peak', current.memPeakMB, baseline.memPeakMB, 'MB', true));

  return lines;
}

// IDENTITY_SEAL: PART-4 | role=baseline | inputs=path,data | outputs=comparison

// ============================================================
// PART 5 — Memory Stress Test
// ============================================================

interface MemoryStressResult {
  peakHeapMB: number;
  allocatedBuffersMB: number;
  gcPressureMs: number;
  survived: boolean;
}

function runMemoryStress(targetSizeMB: number = 50): MemoryStressResult {
  const buffers: Buffer[] = [];
  const stepMB = 5;
  let peakHeap = process.memoryUsage().heapUsed;
  const startTime = performance.now();
  let survived = true;

  try {
    for (let allocated = 0; allocated < targetSizeMB; allocated += stepMB) {
      // Allocate buffer and fill to prevent lazy allocation
      const buf = Buffer.alloc(stepMB * 1024 * 1024, 0xAA);
      buffers.push(buf);
      const heap = process.memoryUsage().heapUsed;
      if (heap > peakHeap) peakHeap = heap;
    }
  } catch {
    survived = false;
  }

  const allocatedMB = buffers.length * stepMB;

  // Force cleanup and measure GC pressure
  const gcStart = performance.now();
  buffers.length = 0;
  // Trigger GC if exposed
  if (typeof global.gc === 'function') {
    global.gc();
  }
  const gcPressureMs = performance.now() - gcStart;

  return {
    peakHeapMB: Math.round(peakHeap / 1024 / 1024 * 10) / 10,
    allocatedBuffersMB: allocatedMB,
    gcPressureMs: Math.round(gcPressureMs * 100) / 100,
    survived,
  };
}

// IDENTITY_SEAL: PART-5 | role=memory-stress | inputs=targetSizeMB | outputs=MemoryStressResult

// ============================================================
// PART 6 — File I/O Stress Test
// ============================================================

interface IOStressResult {
  writeAvgMs: number;
  readAvgMs: number;
  writeP95Ms: number;
  readP95Ms: number;
  totalOps: number;
  errors: number;
}

async function runIOStress(concurrency: number, iterations: number): Promise<IOStressResult> {
  const os = require('os');
  const tmpDir = os.tmpdir();
  const writeTimings: number[] = [];
  const readTimings: number[] = [];
  let errors = 0;
  const testData = Buffer.alloc(4096, 0x42); // 4KB per write

  const batchCount = Math.ceil(iterations / concurrency);
  for (let batch = 0; batch < batchCount; batch++) {
    const batchSize = Math.min(concurrency, iterations - batch * concurrency);
    const promises: Promise<void>[] = [];

    for (let i = 0; i < batchSize; i++) {
      const filePath = path.join(tmpDir, `.cs-stress-io-${batch}-${i}.tmp`);
      promises.push((async () => {
        try {
          // Write
          const wStart = performance.now();
          fs.writeFileSync(filePath, testData);
          writeTimings.push(performance.now() - wStart);

          // Read
          const rStart = performance.now();
          fs.readFileSync(filePath);
          readTimings.push(performance.now() - rStart);

          // Cleanup
          fs.unlinkSync(filePath);
        } catch {
          errors++;
        }
      })());
    }
    await Promise.all(promises);
  }

  const sortedW = writeTimings.sort((a, b) => a - b);
  const sortedR = readTimings.sort((a, b) => a - b);

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const p95 = (arr: number[]) => arr.length > 0 ? arr[Math.floor(arr.length * 0.95)] : 0;

  return {
    writeAvgMs: Math.round(avg(sortedW) * 100) / 100,
    readAvgMs: Math.round(avg(sortedR) * 100) / 100,
    writeP95Ms: Math.round(p95(sortedW) * 100) / 100,
    readP95Ms: Math.round(p95(sortedR) * 100) / 100,
    totalOps: writeTimings.length + readTimings.length,
    errors,
  };
}

// IDENTITY_SEAL: PART-6 | role=io-stress | inputs=concurrency,iterations | outputs=IOStressResult

// ============================================================
// PART 7 — Network (HTTP) Stress Test
// ============================================================

interface HTTPStressResult {
  rps: number;
  latencyAvgMs: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencyP99Ms: number;
  statusCodes: Record<number, number>;
  errors: number;
  totalRequests: number;
}

async function runHTTPStress(url: string, concurrency: number, totalRequests: number): Promise<HTTPStressResult> {
  const http = url.startsWith('https') ? require('https') : require('http');
  const timings: number[] = [];
  const statusCodes: Record<number, number> = {};
  let errors = 0;

  const makeRequest = (): Promise<number> => {
    return new Promise((resolve) => {
      const start = performance.now();
      const req = http.get(url, (res: any) => {
        const code = res.statusCode ?? 0;
        statusCodes[code] = (statusCodes[code] ?? 0) + 1;
        res.resume(); // drain
        res.on('end', () => resolve(performance.now() - start));
      });
      req.on('error', () => {
        errors++;
        resolve(performance.now() - start);
      });
      req.setTimeout(10000, () => {
        req.destroy();
        errors++;
        resolve(performance.now() - start);
      });
    });
  };

  const batchCount = Math.ceil(totalRequests / concurrency);
  for (let batch = 0; batch < batchCount; batch++) {
    const batchSize = Math.min(concurrency, totalRequests - batch * concurrency);
    const promises: Promise<number>[] = [];
    for (let i = 0; i < batchSize; i++) {
      promises.push(makeRequest());
    }
    const batchTimings = await Promise.all(promises);
    timings.push(...batchTimings);
  }

  timings.sort((a, b) => a - b);
  const avg = timings.length > 0 ? timings.reduce((a, b) => a + b, 0) / timings.length : 0;
  const totalDuration = timings.reduce((a, b) => a + b, 0);

  return {
    rps: totalDuration > 0 ? Math.round(timings.length / (totalDuration / 1000) * concurrency) : 0,
    latencyAvgMs: Math.round(avg * 100) / 100,
    latencyP50Ms: timings.length > 0 ? Math.round(timings[Math.floor(timings.length * 0.5)] * 100) / 100 : 0,
    latencyP95Ms: timings.length > 0 ? Math.round(timings[Math.floor(timings.length * 0.95)] * 100) / 100 : 0,
    latencyP99Ms: timings.length > 0 ? Math.round(timings[Math.floor(timings.length * 0.99)] * 100) / 100 : 0,
    statusCodes,
    errors,
    totalRequests: timings.length,
  };
}

// IDENTITY_SEAL: PART-7 | role=http-stress | inputs=url,concurrency,totalRequests | outputs=HTTPStressResult

// ============================================================
// PART 8 — CPU Stress via worker_threads
// ============================================================

interface CPUStressResult {
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  minMs: number;
  maxMs: number;
  errors: number;
  throughput: number;
  timings: number[];
}

async function runCPUStress(
  targetFn: ((...args: any[]) => any) | null,
  concurrency: number,
  iterations: number,
  code: string,
  fnName: string,
): Promise<CPUStressResult> {
  const timings: number[] = [];
  let errors = 0;

  if (targetFn) {
    // Real concurrent execution using Promise batches
    const batchCount = Math.ceil(iterations / concurrency);
    for (let batch = 0; batch < batchCount; batch++) {
      const batchSize = Math.min(concurrency, iterations - batch * concurrency);
      const promises: Promise<number>[] = [];
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
  } else {
    // Fallback: use computeStaticMetrics as CPU benchmark
    for (let i = 0; i < iterations; i++) {
      const t0 = performance.now();
      computeStaticMetrics(code);
      timings.push(performance.now() - t0);
    }
  }

  timings.sort((a, b) => a - b);
  const avg = timings.length > 0 ? timings.reduce((a, b) => a + b, 0) / timings.length : 0;
  const totalTime = timings.reduce((a, b) => a + b, 0);

  return {
    avgMs: Math.round(avg * 100) / 100,
    p50Ms: timings.length > 0 ? Math.round(timings[Math.floor(timings.length * 0.5)] * 100) / 100 : 0,
    p95Ms: timings.length > 0 ? Math.round(timings[Math.floor(timings.length * 0.95)] * 100) / 100 : 0,
    p99Ms: timings.length > 0 ? Math.round(timings[Math.floor(timings.length * 0.99)] * 100) / 100 : 0,
    minMs: timings.length > 0 ? Math.round(timings[0] * 100) / 100 : 0,
    maxMs: timings.length > 0 ? Math.round(timings[timings.length - 1] * 100) / 100 : 0,
    errors,
    throughput: totalTime > 0 ? Math.round(timings.length / (totalTime / 1000 / concurrency) * 100) / 100 : 0,
    timings,
  };
}

// Use worker_threads for true parallel CPU-bound stress when available
async function runWorkerCPUStress(
  targetPath: string,
  fnName: string,
  concurrency: number,
  iterations: number,
): Promise<CPUStressResult | null> {
  try {
    const { Worker, isMainThread } = require('worker_threads');
    if (!isMainThread) return null; // safety

    const perWorker = Math.ceil(iterations / concurrency);
    const workerCode = `
      const { parentPort, workerData } = require('worker_threads');
      (async () => {
        const mod = require(workerData.targetPath);
        const fn = mod[workerData.fnName];
        if (typeof fn !== 'function') {
          parentPort.postMessage({ timings: [], errors: 1 });
          return;
        }
        const timings = [];
        let errors = 0;
        for (let i = 0; i < workerData.iterations; i++) {
          const t0 = performance.now();
          try { await fn(); } catch { errors++; }
          timings.push(performance.now() - t0);
        }
        parentPort.postMessage({ timings, errors });
      })();
    `;

    const resolvedPath = path.resolve(targetPath);
    const workers: Promise<{ timings: number[]; errors: number }>[] = [];
    const activeWorkers = Math.min(concurrency, 8); // cap at 8 workers

    for (let i = 0; i < activeWorkers; i++) {
      workers.push(new Promise((resolve, reject) => {
        const w = new Worker(workerCode, {
          eval: true,
          workerData: { targetPath: resolvedPath, fnName, iterations: perWorker },
        });
        w.on('message', (msg: any) => resolve(msg));
        w.on('error', (err: Error) => resolve({ timings: [], errors: perWorker }));
        w.on('exit', (exitCode: number) => {
          if (exitCode !== 0) resolve({ timings: [], errors: perWorker });
        });
      }));
    }

    const results = await Promise.all(workers);
    const allTimings: number[] = [];
    let totalErrors = 0;
    for (const r of results) {
      allTimings.push(...r.timings);
      totalErrors += r.errors;
    }

    allTimings.sort((a, b) => a - b);
    const avg = allTimings.length > 0 ? allTimings.reduce((a, b) => a + b, 0) / allTimings.length : 0;
    const totalTime = allTimings.reduce((a, b) => a + b, 0);

    return {
      avgMs: Math.round(avg * 100) / 100,
      p50Ms: allTimings.length > 0 ? Math.round(allTimings[Math.floor(allTimings.length * 0.5)] * 100) / 100 : 0,
      p95Ms: allTimings.length > 0 ? Math.round(allTimings[Math.floor(allTimings.length * 0.95)] * 100) / 100 : 0,
      p99Ms: allTimings.length > 0 ? Math.round(allTimings[Math.floor(allTimings.length * 0.99)] * 100) / 100 : 0,
      minMs: allTimings.length > 0 ? Math.round(allTimings[0] * 100) / 100 : 0,
      maxMs: allTimings.length > 0 ? Math.round(allTimings[allTimings.length - 1] * 100) / 100 : 0,
      errors: totalErrors,
      throughput: totalTime > 0 ? Math.round(allTimings.length / (totalTime / 1000 / activeWorkers) * 100) / 100 : 0,
      timings: allTimings,
    };
  } catch {
    return null; // worker_threads not available
  }
}

// IDENTITY_SEAL: PART-8 | role=cpu-stress | inputs=target,concurrency,iterations | outputs=CPUStressResult

// ============================================================
// PART 9 — Stress Runner (main orchestrator)
// ============================================================

interface StressOptions {
  scenario?: string;
  users: string;
  duration: string;
  profile?: string;
  url?: string;
}

export async function runStress(targetPath: string, opts: StressOptions): Promise<void> {
  console.log('CS Quill -- Stress Test\n');

  // Read target file
  const stat = fs.statSync(targetPath);
  let code: string;
  if (stat.isFile()) {
    code = fs.readFileSync(targetPath, 'utf-8');
  } else {
    console.log('  Warning: directory stress test requires a single file.');
    console.log('  Example: cs stress ./src/api/auth.ts');
    return;
  }

  const profile = resolveProfile(opts);
  console.log(`  Profile: ${profile.description}\n`);

  const startTime = performance.now();

  // ── Phase 1: Static metrics ──
  console.log('  [Phase 1] Static metric analysis...');
  const metrics = computeStaticMetrics(code);

  const warnings: string[] = [];
  if (metrics.nestedLoopDepth >= 2) warnings.push(`  Warning: O(n^${metrics.nestedLoopDepth}) nested loops`);
  if (metrics.asyncWithoutTryCatch > 0) warnings.push(`  Warning: ${metrics.asyncWithoutTryCatch} await without try-catch`);
  if (metrics.eventListenerCount > 3) warnings.push(`  Warning: ${metrics.eventListenerCount} addEventListener calls -- memory leak risk`);
  if (metrics.recursiveFunctionCount > 0) warnings.push(`  Warning: ${metrics.recursiveFunctionCount} recursive functions`);
  if (metrics.cyclomaticEstimate > 20) warnings.push(`  Warning: cyclomatic complexity ${metrics.cyclomaticEstimate} -- high complexity`);

  console.log(`        Lines: ${metrics.totalLines} | Functions: ${metrics.functionCount}`);
  console.log(`        Loop depth: ${metrics.nestedLoopDepth} | Cyclomatic: ${metrics.cyclomaticEstimate}`);
  console.log(`        Fetch: ${metrics.fetchCallCount} | Async unguarded: ${metrics.asyncWithoutTryCatch}`);
  console.log(`        EventListeners: ${metrics.eventListenerCount} | Recursive: ${metrics.recursiveFunctionCount}`);

  const staticScore = Math.max(0, 100
    - metrics.nestedLoopDepth * 15
    - metrics.asyncWithoutTryCatch * 10
    - metrics.eventListenerCount * 5
    - metrics.recursiveFunctionCount * 10
    - (metrics.cyclomaticEstimate > 20 ? 20 : metrics.cyclomaticEstimate > 10 ? 10 : 0));
  const staticGrade = staticScore >= 80 ? 'A' : staticScore >= 60 ? 'B' : staticScore >= 40 ? 'C' : 'D';
  console.log(`\n        Static grade: ${staticGrade} (${staticScore}/100)`);

  if (warnings.length > 0) {
    console.log('');
    for (const w of warnings) console.log(`        ${w}`);
  }

  // ── Phase 2: Execution stress tests ──
  const targetUrl = (opts as any).url as string | undefined;

  // 2a: CPU stress
  console.log('\n  [Phase 2a] CPU execution stress...');
  let targetFn: ((...args: any[]) => any) | null = null;
  let fnName = '<module>';

  try {
    const resolved = path.resolve(targetPath);
    const targetModule = require(resolved);
    const exportKeys = Object.keys(targetModule).filter((k: string) => typeof targetModule[k] === 'function');
    if (exportKeys.length > 0) {
      fnName = exportKeys[0];
      targetFn = targetModule[fnName];
    }
  } catch { /* file may not be directly require-able */ }

  // Try worker_threads first for true parallel CPU stress
  let cpuResult: CPUStressResult | null = null;
  if (targetFn) {
    console.log(`        Target: ${fnName} | Concurrency: ${profile.concurrency} | Iterations: ${profile.iterations}`);

    cpuResult = await runWorkerCPUStress(targetPath, fnName, profile.concurrency, profile.iterations);
    if (cpuResult) {
      console.log('        Mode: worker_threads (true parallel)');
    } else {
      console.log('        Mode: Promise batches (async concurrent)');
      cpuResult = await runCPUStress(targetFn, profile.concurrency, profile.iterations, code, fnName);
    }
  } else {
    console.log('        No exported function found. Using static analysis benchmark as CPU load.');
    cpuResult = await runCPUStress(null, profile.concurrency, profile.iterations, code, fnName);
  }

  console.log(`        Avg: ${cpuResult.avgMs.toFixed(2)}ms | Min: ${cpuResult.minMs.toFixed(2)}ms | Max: ${cpuResult.maxMs.toFixed(2)}ms`);
  console.log(`        p50: ${cpuResult.p50Ms.toFixed(2)}ms | p95: ${cpuResult.p95Ms.toFixed(2)}ms | p99: ${cpuResult.p99Ms.toFixed(2)}ms`);
  console.log(`        Errors: ${cpuResult.errors}/${cpuResult.timings.length} (${(cpuResult.errors / Math.max(cpuResult.timings.length, 1) * 100).toFixed(1)}%)`);
  console.log(`        Throughput: ~${cpuResult.throughput} ops/s (concurrent ${profile.concurrency})`);

  const cpuGrade = cpuResult.p95Ms < 1 ? 'A' : cpuResult.p95Ms < 10 ? 'B' : cpuResult.p95Ms < 100 ? 'C' : 'D';
  console.log(`        CPU grade: ${cpuGrade}`);

  // Latency distribution chart
  const chart = renderLatencyChart(cpuResult.timings);
  for (const line of chart) console.log(line);

  // 2b: Memory stress
  console.log('\n  [Phase 2b] Memory stress...');
  const memTarget = profile.concurrency <= 10 ? 25 : profile.concurrency <= 50 ? 50 : 100;
  const memResult = runMemoryStress(memTarget);
  console.log(`        Peak heap: ${memResult.peakHeapMB}MB | Allocated: ${memResult.allocatedBuffersMB}MB`);
  console.log(`        GC pressure: ${memResult.gcPressureMs}ms | Survived: ${memResult.survived ? 'YES' : 'NO'}`);
  const memGrade = memResult.survived && memResult.gcPressureMs < 50 ? 'A' : memResult.survived ? 'B' : 'D';
  console.log(`        Memory grade: ${memGrade}`);

  // 2c: File I/O stress
  console.log('\n  [Phase 2c] File I/O stress...');
  const ioIterations = Math.min(profile.iterations, 200);
  const ioResult = await runIOStress(Math.min(profile.concurrency, 20), ioIterations);
  console.log(`        Write avg: ${ioResult.writeAvgMs.toFixed(2)}ms | Read avg: ${ioResult.readAvgMs.toFixed(2)}ms`);
  console.log(`        Write p95: ${ioResult.writeP95Ms.toFixed(2)}ms | Read p95: ${ioResult.readP95Ms.toFixed(2)}ms`);
  console.log(`        Total ops: ${ioResult.totalOps} | Errors: ${ioResult.errors}`);
  const ioGrade = ioResult.writeP95Ms < 1 && ioResult.readP95Ms < 1 ? 'A' : ioResult.writeP95Ms < 5 ? 'B' : 'C';
  console.log(`        I/O grade: ${ioGrade}`);

  // 2d: Network stress (if URL provided)
  let netGrade = '-';
  if (targetUrl) {
    console.log(`\n  [Phase 2d] HTTP stress (${targetUrl})...`);

    // Try autocannon first
    let usedAutocannon = false;
    try {
      const { runAutocannon } = require('../adapters/perf-engine');
      const result = await runAutocannon(targetUrl, {
        connections: profile.concurrency,
        duration: Math.max(parseInt(opts.duration, 10) || 10, 5),
      });
      console.log(`        RPS: ${result.rps} | Latency avg: ${result.latencyAvg}ms`);
      console.log(`        p50: ${result.latencyP50}ms | p95: ${result.latencyP95}ms | p99: ${result.latencyP99}ms`);
      console.log(`        Errors: ${result.errors} | Timeouts: ${result.timeouts} | Total: ${result.totalRequests}`);
      netGrade = result.latencyP95 < 100 ? 'A' : result.latencyP95 < 500 ? 'B' : result.latencyP95 < 2000 ? 'C' : 'D';
      usedAutocannon = true;
    } catch { /* autocannon not available */ }

    if (!usedAutocannon) {
      // Fallback to native HTTP bombardment
      console.log('        (autocannon unavailable, using native HTTP client)');
      const httpResult = await runHTTPStress(targetUrl, profile.concurrency, profile.iterations);
      console.log(`        RPS: ~${httpResult.rps} | Latency avg: ${httpResult.latencyAvgMs.toFixed(2)}ms`);
      console.log(`        p50: ${httpResult.latencyP50Ms.toFixed(2)}ms | p95: ${httpResult.latencyP95Ms.toFixed(2)}ms | p99: ${httpResult.latencyP99Ms.toFixed(2)}ms`);
      console.log(`        Errors: ${httpResult.errors} | Total: ${httpResult.totalRequests}`);
      if (Object.keys(httpResult.statusCodes).length > 0) {
        const codes = Object.entries(httpResult.statusCodes).map(([k, v]) => `${k}:${v}`).join(' ');
        console.log(`        Status codes: ${codes}`);
      }
      netGrade = httpResult.latencyP95Ms < 100 ? 'A' : httpResult.latencyP95Ms < 500 ? 'B' : httpResult.latencyP95Ms < 2000 ? 'C' : 'D';
    }
    console.log(`        Network grade: ${netGrade}`);
  } else {
    console.log('\n  [Phase 2d] Network stress: skipped (use --url <endpoint> to enable)');
  }

  // ── Phase 3: Report & Baseline ──
  const errorRate = cpuResult.errors / Math.max(cpuResult.timings.length, 1);
  const currentBaseline: BaselineData = {
    timestamp: Date.now(),
    profile: profile.name,
    file: targetPath,
    avgMs: cpuResult.avgMs,
    p50Ms: cpuResult.p50Ms,
    p95Ms: cpuResult.p95Ms,
    p99Ms: cpuResult.p99Ms,
    errorRate,
    throughput: cpuResult.throughput,
    memPeakMB: memResult.peakHeapMB,
  };

  // Compare with previous baseline
  const previousBaseline = loadBaseline(targetPath);
  if (previousBaseline) {
    console.log('\n  [Phase 3] Baseline comparison:');
    const compLines = renderComparison(currentBaseline, previousBaseline);
    for (const line of compLines) console.log(line);
  } else {
    console.log('\n  [Phase 3] No previous baseline found. Current results saved as baseline.');
  }

  // Save current as new baseline
  saveBaseline(targetPath, currentBaseline);

  // Recommendations
  const recs: string[] = [];
  if (cpuResult.p99Ms > cpuResult.p95Ms * 3) recs.push('p99 latency is 3x+ p95 -- investigate outlier causes');
  if (errorRate > 0.05) recs.push(`Error rate ${(errorRate * 100).toFixed(1)}% -- stability check needed`);
  if (cpuResult.maxMs > cpuResult.avgMs * 10) recs.push('Max latency is 10x+ average -- investigate tail latency');
  if (cpuResult.avgMs > 50) recs.push('Average execution > 50ms -- optimization recommended');
  if (!memResult.survived) recs.push('Memory stress test failed -- possible OOM risk');
  if (memResult.gcPressureMs > 100) recs.push(`GC pressure ${memResult.gcPressureMs}ms -- review allocation patterns`);
  if (ioResult.errors > 0) recs.push(`File I/O errors: ${ioResult.errors} -- check disk access`);

  if (recs.length > 0) {
    console.log('\n  Recommendations (measured):');
    for (const rec of recs) console.log(`     - ${rec}`);
  }

  // Quick fix suggestions based on static metrics
  if (warnings.length > 0) {
    console.log('\n  Quick fixes:');
    if (metrics.nestedLoopDepth >= 2) console.log('     -> Replace nested loops with Map/Set lookups');
    if (metrics.asyncWithoutTryCatch > 0) console.log('     -> Add try-catch to unguarded await');
    if (metrics.eventListenerCount > 3) console.log('     -> Use removeEventListener or AbortController');
    if (metrics.recursiveFunctionCount > 0) console.log('     -> Add depth limit to recursion');
  }

  // Overall grade
  const grades = [staticGrade, cpuGrade, memGrade, ioGrade];
  if (netGrade !== '-') grades.push(netGrade);
  const gradeValues: Record<string, number> = { A: 4, B: 3, C: 2, D: 1 };
  const avgGradeVal = grades.reduce((sum, g) => sum + (gradeValues[g] ?? 2), 0) / grades.length;
  const overallGrade = avgGradeVal >= 3.5 ? 'A' : avgGradeVal >= 2.5 ? 'B' : avgGradeVal >= 1.5 ? 'C' : 'D';
  console.log(`\n  Overall grade: ${overallGrade} (static:${staticGrade} cpu:${cpuGrade} mem:${memGrade} io:${ioGrade}${netGrade !== '-' ? ` net:${netGrade}` : ''})`);

  const duration = Math.round(performance.now() - startTime);
  try { const { recordCommand } = require('../core/session'); recordCommand(`stress ${targetPath}`); } catch {}
  console.log(`\n  Completed: ${duration}ms\n`);
}

// IDENTITY_SEAL: PART-9 | role=stress-runner | inputs=path,opts | outputs=console
