// @ts-nocheck — external library wrapper, types handled at runtime
// ============================================================
// CS Quill 🦔 — Performance Engine Adapter
// ============================================================
// 5 packages: autocannon, clinic.js, 0x, tinybench, c8

// ============================================================
// PART 1 — Autocannon (HTTP 부하 테스트)
// ============================================================

export async function runAutocannon(url: string, opts?: { connections?: number; duration?: number }) {
  let autocannon: any;
  try { autocannon = (require('autocannon')).default; } catch {
    throw new Error('MISSING: autocannon is not installed. Run: npm i autocannon');
  }

  return new Promise<{
    rps: number; latencyAvg: number; latencyP50: number; latencyP95: number; latencyP99: number;
    errors: number; timeouts: number; totalRequests: number;
  }>((resolve) => {
    const instance = autocannon({
      url,
      connections: opts?.connections ?? 10,
      duration: opts?.duration ?? 10,
    });

    autocannon.track(instance, { renderProgressBar: false });

    instance.on('done', (result: unknown) => {
      resolve({
        rps: result.requests?.average ?? 0,
        latencyAvg: result.latency?.average ?? 0,
        latencyP50: result.latency?.p50 ?? 0,
        latencyP95: result.latency?.p95 ?? 0,
        latencyP99: result.latency?.p99 ?? 0,
        errors: result.errors ?? 0,
        timeouts: result.timeouts ?? 0,
        totalRequests: result.requests?.total ?? 0,
      });
    });
  });
}

// IDENTITY_SEAL: PART-1 | role=autocannon | inputs=url,opts | outputs=metrics

// ============================================================
// PART 2 — Tinybench (함수 벤치마크)
// ============================================================

export async function runTinybench(benchmarks: Array<{ name: string; fn: () => void | Promise<void> }>) {
  let Bench: any;
  try { ({ Bench } = require('tinybench')); } catch {
    throw new Error('MISSING: tinybench is not installed. Run: npm i tinybench');
  }

  const bench = new Bench({ time: 1000 });

  for (const b of benchmarks) {
    bench.add(b.name, b.fn);
  }

  await bench.run();

  return bench.tasks.map(task => ({
    name: task.name,
    opsPerSec: Math.round(task.result?.hz ?? 0),
    avgMs: task.result?.mean ? task.result.mean * 1000 : 0,
    p75Ms: task.result?.p75 ? task.result.p75 * 1000 : 0,
    p99Ms: task.result?.p99 ? task.result.p99 * 1000 : 0,
    samples: task.result?.samples?.length ?? 0,
  }));
}

// IDENTITY_SEAL: PART-2 | role=tinybench | inputs=benchmarks | outputs=results

// ============================================================
// PART 3 — c8 (커버리지)
// ============================================================

export async function runC8(command: string, rootPath: string) {
  // Verify c8 is available before attempting to use it
  try { require.resolve('c8'); } catch {
    throw new Error('MISSING: c8 is not installed. Run: npm i c8');
  }
  const { execSync } = require('child_process');
  try {
    const _output = execSync(`npx c8 --reporter=json-summary ${command} 2>/dev/null`, {
      cwd: rootPath, encoding: 'utf-8', timeout: 60000,
    });

    // Parse summary from coverage/coverage-summary.json
    const { readFileSync, existsSync } = require('fs');
    const { join } = require('path');
    const summaryPath = join(rootPath, 'coverage', 'coverage-summary.json');

    if (existsSync(summaryPath)) {
      const summary = JSON.parse(readFileSync(summaryPath, 'utf-8'));
      const total = summary.total ?? {};
      return {
        lines: total.lines?.pct ?? 0,
        branches: total.branches?.pct ?? 0,
        functions: total.functions?.pct ?? 0,
        statements: total.statements?.pct ?? 0,
      };
    }

    return { lines: 0, branches: 0, functions: 0, statements: 0 };
  } catch {
    return { lines: 0, branches: 0, functions: 0, statements: 0 };
  }
}

// IDENTITY_SEAL: PART-3 | role=c8 | inputs=command,rootPath | outputs=coverage

// ============================================================
// PART 4 — Memory Leak Detection (clinic.js 대안: 직접 측정)
// ============================================================

export async function measureMemoryGrowth(fn: () => Promise<void>, iterations: number = 100) {
  const snapshots: Array<{ iteration: number; heapUsedMB: number; rss: number }> = [];

  // Phase 1: Warm-up (stabilize JIT, caches)
  for (let i = 0; i < Math.min(10, Math.floor(iterations * 0.1)); i++) {
    await fn();
  }
  if (globalThis.gc) globalThis.gc();
  await new Promise(r => setTimeout(r, 50));

  // Phase 2: Measure with frequent snapshots
  const snapshotInterval = Math.max(1, Math.floor(iterations / 20));
  for (let i = 0; i < iterations; i++) {
    await fn();
    if (i % snapshotInterval === 0 || i === iterations - 1) {
      if (globalThis.gc) globalThis.gc();
      const mem = process.memoryUsage();
      snapshots.push({
        iteration: i,
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100,
        rss: Math.round(mem.rss / 1024 / 1024 * 100) / 100,
      });
    }
  }

  const first = snapshots[0]?.heapUsedMB ?? 0;
  const last = snapshots[snapshots.length - 1]?.heapUsedMB ?? 0;
  const growth = last - first;

  // Linear regression on snapshots to compute growth rate (MB per iteration)
  const n = snapshots.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const s of snapshots) {
    sumX += s.iteration;
    sumY += s.heapUsedMB;
    sumXY += s.iteration * s.heapUsedMB;
    sumXX += s.iteration * s.iteration;
  }
  const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) : 0;
  const growthRateMBPerIter = Math.round(slope * 10000) / 10000;

  // Monotonic growth check: how many consecutive increases?
  let maxConsecutiveRise = 0;
  let currentRise = 0;
  for (let i = 1; i < snapshots.length; i++) {
    if (snapshots[i].heapUsedMB > snapshots[i - 1].heapUsedMB + 0.05) {
      currentRise++;
      maxConsecutiveRise = Math.max(maxConsecutiveRise, currentRise);
    } else {
      currentRise = 0;
    }
  }

  // Leak detection: positive slope + sustained growth pattern (not just a spike)
  const leakSuspected = (
    growthRateMBPerIter > 0.01 &&
    maxConsecutiveRise >= Math.floor(snapshots.length * 0.4)
  ) || growth > 50;

  const leakConfidence = growthRateMBPerIter <= 0 ? 'none'
    : growthRateMBPerIter < 0.01 ? 'low'
    : growthRateMBPerIter < 0.05 ? 'medium'
    : 'high';

  return {
    snapshots, growth: Math.round(growth * 100) / 100,
    leakSuspected, leakConfidence,
    growthRateMBPerIter, maxConsecutiveRise,
    firstMB: first, lastMB: last,
  };
}

// IDENTITY_SEAL: PART-4 | role=memory-measure | inputs=fn,iterations | outputs=snapshots

// ============================================================
// PART 5 — Unified Perf Runner
// ============================================================

export async function runFullPerfAnalysis(rootPath: string) {
  const results: Array<{ engine: string; score: number; detail: string }> = [];

  // c8 coverage
  try {
    let c8Available = false;
    try { require.resolve('c8'); c8Available = true; } catch {}
    if (!c8Available) {
      results.push({ engine: 'c8', score: 0, detail: 'MISSING: install c8 — npm i c8. No fake fallback.' });
    } else {
      const coverage = await runC8('npm test -- --no-coverage 2>/dev/null', rootPath);
      const score = Math.round((coverage.lines + coverage.branches + coverage.functions) / 3);
      results.push({ engine: 'c8', score, detail: `lines ${coverage.lines}% branches ${coverage.branches}%` });
    }
  } catch {
    results.push({ engine: 'c8', score: 0, detail: 'coverage run failed' });
  }

  // Tinybench — benchmark REAL bottlenecks (not fake JSON.parse)
  try {
    // Fail fast with clear message if tinybench is not installed
    let tinybenchAvailable = false;
    try { require('tinybench'); tinybenchAvailable = true; } catch {}
    if (!tinybenchAvailable) {
      results.push({ engine: 'tinybench', score: 0, detail: 'MISSING: install tinybench — npm i tinybench. No fake fallback.' });
    } else {
      const { existsSync, readFileSync, readdirSync } = require('fs');
      const { join, resolve } = require('path');
      const { execSync } = require('child_process');
      const pkgPath = join(rootPath, 'package.json');
      const benchmarks: Array<{ name: string; fn: () => void | Promise<void> }> = [];

      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        const mainFile = pkg.main || pkg.module || 'index.js';
        const mainPath = resolve(rootPath, mainFile);

        // Benchmark 1: Module load time — measure actual require() of target file
        if (existsSync(mainPath)) {
          benchmarks.push({
            name: `module-load(${mainFile})`,
            fn: () => {
              try {
                delete require.cache[require.resolve(mainPath)];
                require(mainPath);
              } catch { /* module may not be loadable outside its context */ }
            },
          });
        }

        // Benchmark 2: Cold start — measure CLI process spawn time
        const binPath = pkg.bin ? resolve(rootPath, typeof pkg.bin === 'string' ? pkg.bin : Object.values(pkg.bin)[0] as string) : null;
        if (binPath && existsSync(binPath)) {
          benchmarks.push({
            name: 'cold-start(cli-spawn)',
            fn: () => {
              try {
                execSync(`node "${binPath}" --help`, { cwd: rootPath, timeout: 10000, stdio: 'pipe' });
              } catch { /* cli may exit non-zero for --help */ }
            },
          });
        }

        // Benchmark 3: TypeScript AST parse time (using ts-morph if available)
        let tsMorphAvailable = false;
        try { require('ts-morph'); tsMorphAvailable = true; } catch {}
        if (tsMorphAvailable) {
          // Find a sample .ts file to parse
          const sampleFiles = readdirSync(rootPath).filter((f: string) => f.endsWith('.ts') && !f.endsWith('.d.ts'));
          const sampleFile = sampleFiles[0];
          if (sampleFile) {
            const samplePath = join(rootPath, sampleFile);
            const sampleSource = readFileSync(samplePath, 'utf-8');
            benchmarks.push({
              name: `ast-parse(${sampleFile})`,
              fn: () => {
                const { Project } = require('ts-morph');
                const project = new Project({ useInMemoryFileSystem: true });
                project.createSourceFile('__bench__.ts', sampleSource);
              },
            });
          }
        }

        // Benchmark 4: Pipeline throughput — single-file verification speed
        const { runStaticPipeline } = require('../core/pipeline-bridge');
        if (typeof runStaticPipeline === 'function') {
          // Use a small sample from the project itself
          const sampleForPipeline = existsSync(mainPath) ? readFileSync(mainPath, 'utf-8').slice(0, 2000) : 'const x = 1;';
          benchmarks.push({
            name: 'pipeline-throughput(single-file)',
            fn: async () => {
              await runStaticPipeline(sampleForPipeline, 'typescript');
            },
          });
        }
      }

      if (benchmarks.length === 0) {
        results.push({ engine: 'tinybench', score: 0, detail: 'no benchmarkable targets found in project' });
      } else {
        const benchResult = await runTinybench(benchmarks);
        const avgOps = benchResult.reduce((s, r) => s + r.opsPerSec, 0) / benchResult.length;
        const score = avgOps > 10000 ? 100 : avgOps > 1000 ? 80 : avgOps > 100 ? 60 : 40;
        const detail = benchResult.map(b => `${b.name}: ${b.opsPerSec} ops/s`).join(', ');
        results.push({ engine: 'tinybench', score, detail });
      }
    }
  } catch {
    results.push({ engine: 'tinybench', score: 0, detail: 'benchmark execution failed' });
  }

  // Memory measurement — track heap growth during ACTUAL pipeline execution
  try {
    const { readFileSync, existsSync, readdirSync } = require('fs');
    const { join } = require('path');
    const { runStaticPipeline } = require('../core/pipeline-bridge');

    // Find a real source file to use as pipeline input
    let sampleCode = 'const x = 1;\nexport default x;\n';
    const tsFiles = readdirSync(rootPath).filter((f: string) => f.endsWith('.ts') && !f.endsWith('.d.ts'));
    if (tsFiles.length > 0) {
      const samplePath = join(rootPath, tsFiles[0]);
      if (existsSync(samplePath)) {
        sampleCode = readFileSync(samplePath, 'utf-8').slice(0, 3000);
      }
    }

    if (typeof runStaticPipeline !== 'function') {
      results.push({ engine: 'memory-leak', score: 50, detail: 'pipeline not available for memory measurement' });
    } else {
      // Measure heap before/after actual pipeline runs
      if (globalThis.gc) globalThis.gc();
      const memBefore = process.memoryUsage();

      const memResult = await measureMemoryGrowth(async () => {
        await runStaticPipeline(sampleCode, 'typescript');
      }, 30);

      if (globalThis.gc) globalThis.gc();
      const memAfter = process.memoryUsage();
      const pipelineCostMB = Math.round((memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024 * 100) / 100;

      const score = memResult.leakConfidence === 'none' ? 100
        : memResult.leakConfidence === 'low' ? 85
        : memResult.leakConfidence === 'medium' ? 60 : 30;
      results.push({
        engine: 'memory-leak',
        score,
        detail: `pipeline memory cost ${pipelineCostMB}MB, growth ${memResult.growth}MB, rate ${memResult.growthRateMBPerIter}MB/iter, confidence ${memResult.leakConfidence}`,
      });
    }
  } catch {
    results.push({ engine: 'memory-leak', score: 50, detail: 'measurement failed' });
  }

  const avgScore = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;
  return { engines: results.length, results, avgScore };
}

// IDENTITY_SEAL: PART-5 | role=unified-perf | inputs=rootPath | outputs=results
