// @ts-nocheck — external library wrapper, types handled at runtime
// ============================================================
// CS Quill 🦔 — Performance Engine Adapter
// ============================================================
// 5 packages: autocannon, clinic.js, 0x, tinybench, c8

// ============================================================
// PART 1 — Autocannon (HTTP 부하 테스트)
// ============================================================

export async function runAutocannon(url: string, opts?: { connections?: number; duration?: number }) {
  const autocannon = (await import('autocannon')).default;

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
  const { Bench } = await import('tinybench');

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
  const { execSync } = await import('child_process');
  try {
    const _output = execSync(`npx c8 --reporter=json-summary ${command} 2>/dev/null`, {
      cwd: rootPath, encoding: 'utf-8', timeout: 60000,
    });

    // Parse summary from coverage/coverage-summary.json
    const { readFileSync, existsSync } = await import('fs');
    const { join } = await import('path');
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
  const snapshots: Array<{ iteration: number; heapUsedMB: number }> = [];

  for (let i = 0; i < iterations; i++) {
    await fn();
    if (i % 10 === 0 || i === iterations - 1) {
      if (globalThis.gc) globalThis.gc();
      const mem = process.memoryUsage();
      snapshots.push({ iteration: i, heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024 * 10) / 10 });
    }
  }

  const first = snapshots[0]?.heapUsedMB ?? 0;
  const last = snapshots[snapshots.length - 1]?.heapUsedMB ?? 0;
  const growth = last - first;
  const leakSuspected = growth > 10; // >10MB growth = suspicious

  return { snapshots, growth, leakSuspected, firstMB: first, lastMB: last };
}

// IDENTITY_SEAL: PART-4 | role=memory-measure | inputs=fn,iterations | outputs=snapshots

// ============================================================
// PART 5 — Unified Perf Runner
// ============================================================

export async function runFullPerfAnalysis(rootPath: string) {
  const results: Array<{ engine: string; score: number; detail: string }> = [];

  // c8 coverage
  try {
    const coverage = await runC8('npm test -- --no-coverage 2>/dev/null', rootPath);
    const score = Math.round((coverage.lines + coverage.branches + coverage.functions) / 3);
    results.push({ engine: 'c8', score, detail: `lines ${coverage.lines}% branches ${coverage.branches}%` });
  } catch {
    results.push({ engine: 'c8', score: 0, detail: 'no tests' });
  }

  const avgScore = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;
  return { engines: results.length, results, avgScore };
}

// IDENTITY_SEAL: PART-5 | role=unified-perf | inputs=rootPath | outputs=results
