// @ts-nocheck — external library wrapper, types handled at runtime
// ============================================================
// CS Quill 🦔 — Test Engine Adapter
// ============================================================
// vitest programmatic API + fast-check PBT + stryker mutation.

// ============================================================
// PART 1 — Vitest Runner (Programmatic API)
// ============================================================

export interface VitestResult {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  failures: Array<{ name: string; error: string; file: string }>;
}

export async function runVitest(rootPath: string): Promise<VitestResult> {
  try {
    // 1차: vitest programmatic API
    const { startVitest } = require('vitest/node');

    const vitest = await startVitest('test', [], {
      root: rootPath,
      watch: false,
      reporters: [{ onInit() {}, onFinished() {} } as unknown],
      passWithNoTests: true,
    });

    if (vitest) {
      const files = vitest.state.getFiles();
      const failures: VitestResult['failures'] = [];
      let passed = 0;
      let failed = 0;
      let skipped = 0;

      for (const file of files) {
        for (const task of file.tasks ?? []) {
          if (task.result?.state === 'pass') passed++;
          else if (task.result?.state === 'fail') {
            failed++;
            failures.push({
              name: task.name,
              error: task.result?.errors?.[0]?.message ?? 'unknown',
              file: file.filepath,
            });
          } else skipped++;
        }
      }

      await vitest.close();

      return {
        total: passed + failed + skipped,
        passed,
        failed,
        skipped,
        duration: files.reduce((sum, f) => sum + (f.result?.duration ?? 0), 0),
        failures,
      };
    }
  } catch {
    // vitest/node not available
  }

  // 2차: CLI fallback (JSON output)
  try {
    const { execSync } = require('child_process');
    const output = execSync('npx vitest run --reporter=json 2>/dev/null', {
      cwd: rootPath, encoding: 'utf-8', timeout: 120000,
    });
    const data = JSON.parse(output);
    return {
      total: data.numTotalTests ?? 0,
      passed: data.numPassedTests ?? 0,
      failed: data.numFailedTests ?? 0,
      skipped: data.numPendingTests ?? 0,
      duration: data.testResults?.[0]?.perfStats?.runtime ?? 0,
      failures: (data.testResults ?? [])
        .flatMap((tr: unknown) => (tr.assertionResults ?? [])
          .filter((ar: unknown) => ar.status === 'failed')
          .map((ar: unknown) => ({
            name: ar.fullName ?? ar.title ?? 'unknown',
            error: ar.failureMessages?.[0]?.slice(0, 200) ?? 'unknown',
            file: tr.name ?? '',
          })),
        ),
    };
  } catch {
    // 3차: jest fallback
    try {
      const { execSync } = require('child_process');
      const output = execSync('npx jest --json 2>/dev/null', {
        cwd: rootPath, encoding: 'utf-8', timeout: 120000,
      });
      const data = JSON.parse(output);
      return {
        total: data.numTotalTests ?? 0,
        passed: data.numPassedTests ?? 0,
        failed: data.numFailedTests ?? 0,
        skipped: data.numPendingTests ?? 0,
        duration: 0,
        failures: [],
      };
    } catch {
      return { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0, failures: [] };
    }
  }
}

// IDENTITY_SEAL: PART-1 | role=vitest | inputs=rootPath | outputs=VitestResult

// ============================================================
// PART 2 — fast-check Property-Based Testing
// ============================================================

export interface PBTResult {
  properties: Array<{
    name: string;
    passed: boolean;
    numRuns: number;
    counterexample?: string;
    error?: string;
  }>;
  totalPassed: number;
  totalFailed: number;
}

export interface PropertySpec {
  name: string;
  arbitraries: string[];  // 'string', 'integer', 'float', 'boolean', 'json', 'array(integer)'
  predicate: (args: unknown[]) => boolean | void;
  numRuns?: number;
}

export async function runPropertyTests(specs: PropertySpec[]): Promise<PBTResult> {
  const fc = require('fast-check');
  const results: PBTResult['properties'] = [];

  function resolveArbitrary(desc: string): fc.Arbitrary<unknown> {
    switch (desc) {
      case 'string': return fc.string();
      case 'integer': return fc.integer();
      case 'float': return fc.float();
      case 'boolean': return fc.boolean();
      case 'json': return fc.json();
      case 'nat': return fc.nat();
      case 'bigInt': return fc.bigInt();
      case 'date': return fc.date();
      case 'emailAddress': return fc.emailAddress();
      case 'uuid': return fc.uuid();
      case 'ipV4': return fc.ipV4();
      case 'webUrl': return fc.webUrl();
      default: {
        // array(type) 패턴
        const arrayMatch = desc.match(/^array\((\w+)\)$/);
        if (arrayMatch) return fc.array(resolveArbitrary(arrayMatch[1]));
        return fc.anything();
      }
    }
  }

  for (const spec of specs) {
    try {
      const arbitraries = spec.arbitraries.map(resolveArbitrary);

      if (arbitraries.length === 1) {
        fc.assert(
          fc.property(arbitraries[0], (a) => spec.predicate([a])),
          { numRuns: spec.numRuns ?? 100, endOnFailure: true },
        );
      } else if (arbitraries.length === 2) {
        fc.assert(
          fc.property(arbitraries[0], arbitraries[1], (a, b) => spec.predicate([a, b])),
          { numRuns: spec.numRuns ?? 100, endOnFailure: true },
        );
      } else if (arbitraries.length === 3) {
        fc.assert(
          fc.property(arbitraries[0], arbitraries[1], arbitraries[2], (a, b, c) => spec.predicate([a, b, c])),
          { numRuns: spec.numRuns ?? 100, endOnFailure: true },
        );
      } else {
        fc.assert(
          fc.property(fc.tuple(...arbitraries), (tuple) => spec.predicate(tuple as unknown[])),
          { numRuns: spec.numRuns ?? 100, endOnFailure: true },
        );
      }

      results.push({ name: spec.name, passed: true, numRuns: spec.numRuns ?? 100 });
    } catch (e) {
      const error = e as Error & { counterexample?: unknown[] };
      results.push({
        name: spec.name,
        passed: false,
        numRuns: spec.numRuns ?? 100,
        counterexample: error.counterexample ? JSON.stringify(error.counterexample).slice(0, 200) : undefined,
        error: error.message?.slice(0, 200),
      });
    }
  }

  return {
    properties: results,
    totalPassed: results.filter(r => r.passed).length,
    totalFailed: results.filter(r => !r.passed).length,
  };
}

/** fast-check 사양 실행 — runPropertyTests 별칭 (index export 호환) */
export async function runFastCheck(specs: PropertySpec[]): Promise<PBTResult> {
  return runPropertyTests(specs);
}

// Convenience: 함수에 대해 자동 PBT 생성
export async function autoFuzzFunction(
  fnCode: string,
  fnName: string,
  paramTypes: string[] = ['string'],
  numRuns: number = 100,
): Promise<PBTResult> {
  const { runInVM } = require('./sandbox');

  return runPropertyTests([
    {
      name: `${fnName} does not throw`,
      arbitraries: paramTypes,
      numRuns,
      predicate: (args) => {
        const argsStr = args.map(a => JSON.stringify(a)).join(', ');
        const testCode = `${fnCode}\ntry { ${fnName}(${argsStr}); console.log("ok"); } catch(e) { console.log("crash:" + e.message); }`;
        const result = runInVM(testCode, { timeout: 1000 });
        return !result.stdout.startsWith('crash:');
      },
    },
    {
      name: `${fnName} returns in <100ms`,
      arbitraries: paramTypes,
      numRuns: Math.min(numRuns, 50),
      predicate: (args) => {
        const argsStr = args.map(a => JSON.stringify(a)).join(', ');
        const testCode = `${fnCode}\nconst s=Date.now(); ${fnName}(${argsStr}); console.log(Date.now()-s);`;
        const result = runInVM(testCode, { timeout: 1000 });
        return result.success && parseInt(result.stdout) < 100;
      },
    },
  ]);
}

// IDENTITY_SEAL: PART-2 | role=fast-check | inputs=specs | outputs=PBTResult

// ============================================================
// PART 3 — Stryker (뮤테이션 테스트)
// ============================================================

export interface MutationResult {
  mutationScore: number;
  killed: number;
  survived: number;
  noCoverage: number;
  timeout: number;
  details: Array<{ mutant: string; status: string; file: string }>;
}

export async function runStryker(rootPath: string): Promise<MutationResult> {
  const { execSync } = require('child_process');

  try {
    const output = execSync('npx stryker run --reporters json 2>/dev/null', {
      cwd: rootPath, encoding: 'utf-8', timeout: 300000,
    });

    // JSON reporter output 파싱
    try {
      const data = JSON.parse(output);
      if (data.files) {
        let killed = 0, survived = 0, noCoverage = 0, timeoutCount = 0;
        const details: MutationResult['details'] = [];

        for (const [file, fileData] of Object.entries(data.files as Record<string, unknown>)) {
          for (const mutant of (fileData.mutants ?? [])) {
            if (mutant.status === 'Killed') killed++;
            else if (mutant.status === 'Survived') {
              survived++;
              details.push({ mutant: mutant.mutatorName ?? '', status: 'survived', file });
            } else if (mutant.status === 'NoCoverage') noCoverage++;
            else if (mutant.status === 'Timeout') timeoutCount++;
          }
        }

        const total = killed + survived + noCoverage + timeoutCount;
        return {
          mutationScore: total > 0 ? Math.round((killed / total) * 100) : 0,
          killed, survived, noCoverage, timeout: timeoutCount,
          details: details.slice(0, 20),
        };
      }
    } catch { /* not JSON format */ }

    // Fallback: regex parsing
    const scoreMatch = output.match(/Mutation score:\s*([\d.]+)%/);
    const killedMatch = output.match(/Killed:\s*(\d+)/);
    const survivedMatch = output.match(/Survived:\s*(\d+)/);

    return {
      mutationScore: scoreMatch ? parseFloat(scoreMatch[1]) : 0,
      killed: killedMatch ? parseInt(killedMatch[1], 10) : 0,
      survived: survivedMatch ? parseInt(survivedMatch[1], 10) : 0,
      noCoverage: 0, timeout: 0, details: [],
    };
  } catch {
    return { mutationScore: 0, killed: 0, survived: 0, noCoverage: 0, timeout: 0, details: [] };
  }
}

// IDENTITY_SEAL: PART-3 | role=stryker | inputs=rootPath | outputs=MutationResult

// ============================================================
// PART 4 — Mocha Runner
// ============================================================

export interface MochaResult {
  total: number;
  passed: number;
  failed: number;
  pending: number;
  duration: number;
  failures: Array<{ name: string; error: string; file: string }>;
}

export async function runMocha(rootPath: string): Promise<MochaResult> {
  const { execSync } = require('child_process');

  try {
    const output = execSync('npx mocha --reporter json --recursive 2>/dev/null', {
      cwd: rootPath, encoding: 'utf-8', timeout: 120000,
    });

    const data = JSON.parse(output);
    return {
      total: data.stats?.tests ?? 0,
      passed: data.stats?.passes ?? 0,
      failed: data.stats?.failures ?? 0,
      pending: data.stats?.pending ?? 0,
      duration: data.stats?.duration ?? 0,
      failures: (data.failures ?? []).map((f: unknown) => ({
        name: f.fullTitle ?? f.title ?? 'unknown',
        error: f.err?.message?.slice(0, 200) ?? 'unknown',
        file: f.file ?? '',
      })),
    };
  } catch {
    return { total: 0, passed: 0, failed: 0, pending: 0, duration: 0, failures: [] };
  }
}

// IDENTITY_SEAL: PART-4 | role=mocha | inputs=rootPath | outputs=MochaResult

// ============================================================
// PART 5 — Test Runner Auto-Detection
// ============================================================

export type TestRunner = 'vitest' | 'jest' | 'mocha' | 'unknown';

export function detectTestRunner(rootPath: string): { runner: TestRunner; configFile: string | null } {
  const { existsSync, readFileSync } = require('fs');
  const { join } = require('path');

  // Check for vitest config
  const vitestConfigs = ['vitest.config.ts', 'vitest.config.js', 'vitest.config.mts', 'vitest.config.mjs'];
  for (const cfg of vitestConfigs) {
    if (existsSync(join(rootPath, cfg))) return { runner: 'vitest', configFile: cfg };
  }

  // Check for jest config
  const jestConfigs = ['jest.config.ts', 'jest.config.js', 'jest.config.cjs', 'jest.config.mjs', 'jest.config.json'];
  for (const cfg of jestConfigs) {
    if (existsSync(join(rootPath, cfg))) return { runner: 'jest', configFile: cfg };
  }

  // Check for mocha config
  const mochaConfigs = ['.mocharc.yml', '.mocharc.yaml', '.mocharc.json', '.mocharc.js', '.mocharc.cjs'];
  for (const cfg of mochaConfigs) {
    if (existsSync(join(rootPath, cfg))) return { runner: 'mocha', configFile: cfg };
  }

  // Check package.json for runner hints
  try {
    const pkgPath = join(rootPath, 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      const scripts = JSON.stringify(pkg.scripts ?? {});

      if (allDeps['vitest'] || scripts.includes('vitest')) return { runner: 'vitest', configFile: null };
      if (allDeps['jest'] || scripts.includes('jest')) return { runner: 'jest', configFile: null };
      if (allDeps['mocha'] || scripts.includes('mocha')) return { runner: 'mocha', configFile: null };

      // Check for jest config in package.json
      if (pkg.jest) return { runner: 'jest', configFile: 'package.json (jest key)' };
    }
  } catch { /* skip */ }

  return { runner: 'unknown', configFile: null };
}

// IDENTITY_SEAL: PART-5 | role=detect-runner | inputs=rootPath | outputs=runner

// ============================================================
// PART 6 — Coverage Threshold Enforcement
// ============================================================

export interface CoverageThresholds {
  lines?: number;
  branches?: number;
  functions?: number;
  statements?: number;
}

export interface CoverageEnforcementResult {
  passed: boolean;
  actual: { lines: number; branches: number; functions: number; statements: number };
  thresholds: CoverageThresholds;
  failures: Array<{ metric: string; actual: number; threshold: number; gap: number }>;
}

export async function enforceCoverageThresholds(
  rootPath: string,
  thresholds: CoverageThresholds = { lines: 80, branches: 70, functions: 80, statements: 80 },
): Promise<CoverageEnforcementResult> {
  const { readFileSync, existsSync } = require('fs');
  const { join } = require('path');

  // Try reading existing coverage data
  const coveragePaths = [
    join(rootPath, 'coverage', 'coverage-summary.json'),
    join(rootPath, 'coverage', 'coverage-final.json'),
  ];

  let actual = { lines: 0, branches: 0, functions: 0, statements: 0 };

  for (const covPath of coveragePaths) {
    if (existsSync(covPath)) {
      try {
        const data = JSON.parse(readFileSync(covPath, 'utf-8'));
        const total = data.total ?? {};
        actual = {
          lines: total.lines?.pct ?? 0,
          branches: total.branches?.pct ?? 0,
          functions: total.functions?.pct ?? 0,
          statements: total.statements?.pct ?? 0,
        };
        break;
      } catch { /* skip */ }
    }
  }

  // If no coverage data, try generating it
  if (actual.lines === 0 && actual.branches === 0) {
    try {
      const { execSync } = require('child_process');
      const detected = detectTestRunner(rootPath);
      let cmd = '';
      if (detected.runner === 'vitest') cmd = 'npx vitest run --coverage --reporter=json 2>/dev/null';
      else if (detected.runner === 'jest') cmd = 'npx jest --coverage --coverageReporters=json-summary 2>/dev/null';

      if (cmd) {
        execSync(cmd, { cwd: rootPath, encoding: 'utf-8', timeout: 120000, stdio: ['pipe', 'pipe', 'pipe'] });
        const summaryPath = join(rootPath, 'coverage', 'coverage-summary.json');
        if (existsSync(summaryPath)) {
          const data = JSON.parse(readFileSync(summaryPath, 'utf-8'));
          const total = data.total ?? {};
          actual = {
            lines: total.lines?.pct ?? 0,
            branches: total.branches?.pct ?? 0,
            functions: total.functions?.pct ?? 0,
            statements: total.statements?.pct ?? 0,
          };
        }
      }
    } catch { /* coverage generation failed */ }
  }

  const failures: CoverageEnforcementResult['failures'] = [];
  const metrics = ['lines', 'branches', 'functions', 'statements'] as const;
  for (const m of metrics) {
    const threshold = thresholds[m];
    if (threshold !== undefined && actual[m] < threshold) {
      failures.push({ metric: m, actual: actual[m], threshold, gap: Math.round((threshold - actual[m]) * 10) / 10 });
    }
  }

  return { passed: failures.length === 0, actual, thresholds, failures };
}

// IDENTITY_SEAL: PART-6 | role=coverage-threshold | inputs=rootPath,thresholds | outputs=CoverageEnforcementResult

// ============================================================
// PART 7 — Flaky Test Detection
// ============================================================

export interface FlakyTestResult {
  flakyTests: Array<{ name: string; file: string; passCount: number; failCount: number; flakyRate: number }>;
  totalRuns: number;
  totalFlaky: number;
}

export async function detectFlakyTests(rootPath: string, runs: number = 3): Promise<FlakyTestResult> {
  const { execSync } = require('child_process');
  const detected = detectTestRunner(rootPath);

  // Track test outcomes across multiple runs
  const testOutcomes = new Map<string, { file: string; passes: number; fails: number }>();

  for (let r = 0; r < runs; r++) {
    try {
      let cmd = '';
      if (detected.runner === 'vitest') cmd = 'npx vitest run --reporter=json 2>/dev/null';
      else if (detected.runner === 'jest') cmd = 'npx jest --json 2>/dev/null';
      else if (detected.runner === 'mocha') cmd = 'npx mocha --reporter json --recursive 2>/dev/null';
      else cmd = 'npx vitest run --reporter=json 2>/dev/null';

      const output = execSync(cmd, { cwd: rootPath, encoding: 'utf-8', timeout: 120000, stdio: ['pipe', 'pipe', 'pipe'] });
      const data = JSON.parse(output);

      // Parse test results depending on runner format
      if (detected.runner === 'mocha') {
        for (const test of (data.passes ?? [])) {
          const key = `${test.fullTitle}`;
          const existing = testOutcomes.get(key) ?? { file: test.file ?? '', passes: 0, fails: 0 };
          existing.passes++;
          testOutcomes.set(key, existing);
        }
        for (const test of (data.failures ?? [])) {
          const key = `${test.fullTitle}`;
          const existing = testOutcomes.get(key) ?? { file: test.file ?? '', passes: 0, fails: 0 };
          existing.fails++;
          testOutcomes.set(key, existing);
        }
      } else {
        // Vitest/Jest format
        for (const tr of (data.testResults ?? [])) {
          for (const ar of (tr.assertionResults ?? [])) {
            const key = ar.fullName ?? ar.title ?? 'unknown';
            const existing = testOutcomes.get(key) ?? { file: tr.name ?? '', passes: 0, fails: 0 };
            if (ar.status === 'passed') existing.passes++;
            else if (ar.status === 'failed') existing.fails++;
            testOutcomes.set(key, existing);
          }
        }
      }
    } catch { /* run failed entirely, skip */ }
  }

  // Identify flaky tests: tests that both passed and failed across runs
  const flakyTests: FlakyTestResult['flakyTests'] = [];
  for (const [name, outcome] of testOutcomes) {
    if (outcome.passes > 0 && outcome.fails > 0) {
      const totalRuns = outcome.passes + outcome.fails;
      flakyTests.push({
        name,
        file: outcome.file,
        passCount: outcome.passes,
        failCount: outcome.fails,
        flakyRate: Math.round((outcome.fails / totalRuns) * 100),
      });
    }
  }

  flakyTests.sort((a, b) => b.flakyRate - a.flakyRate);

  return { flakyTests, totalRuns: runs, totalFlaky: flakyTests.length };
}

// IDENTITY_SEAL: PART-7 | role=flaky-detection | inputs=rootPath,runs | outputs=FlakyTestResult

// ============================================================
// PART 8 — Unified Test Runner
// ============================================================

export async function runFullTestAnalysis(rootPath: string, opts?: {
  coverageThresholds?: CoverageThresholds;
  detectFlaky?: boolean;
  flakyRuns?: number;
}) {
  const results: Array<{ engine: string; score: number; detail: string }> = [];

  // Auto-detect test runner
  const detected = detectTestRunner(rootPath);
  let testResult: VitestResult | MochaResult;

  if (detected.runner === 'mocha') {
    const mochaResult = await runMocha(rootPath);
    testResult = { ...mochaResult, skipped: mochaResult.pending };
    const testScore = mochaResult.total > 0 ? Math.round((mochaResult.passed / mochaResult.total) * 100) : 0;
    const failDetail = mochaResult.failures.length > 0
      ? ` — ${mochaResult.failures[0].name}: ${mochaResult.failures[0].error.slice(0, 60)}`
      : '';
    results.push({ engine: `mocha (auto-detected)`, score: testScore, detail: `${mochaResult.passed}/${mochaResult.total} passed${failDetail}` });
  } else {
    // Vitest/Jest (existing logic with fallback chain)
    const vitestResult = await runVitest(rootPath);
    testResult = vitestResult;
    const testScore = vitestResult.total > 0 ? Math.round((vitestResult.passed / vitestResult.total) * 100) : 0;
    const failDetail = vitestResult.failures.length > 0
      ? ` — ${vitestResult.failures[0].name}: ${vitestResult.failures[0].error.slice(0, 60)}`
      : '';
    const runnerLabel = detected.runner !== 'unknown' ? detected.runner : 'vitest/jest';
    results.push({ engine: `${runnerLabel} (auto-detected)`, score: testScore, detail: `${vitestResult.passed}/${vitestResult.total} passed${failDetail}` });
  }

  // Coverage threshold enforcement
  try {
    const thresholds = opts?.coverageThresholds ?? { lines: 80, branches: 70, functions: 80, statements: 80 };
    const coverage = await enforceCoverageThresholds(rootPath, thresholds);
    const covScore = coverage.passed ? 100 : Math.max(0, 100 - coverage.failures.length * 15);
    const covDetail = coverage.passed
      ? `all thresholds met (L:${coverage.actual.lines}% B:${coverage.actual.branches}% F:${coverage.actual.functions}%)`
      : coverage.failures.map(f => `${f.metric}: ${f.actual}% < ${f.threshold}%`).join(', ');
    results.push({ engine: 'coverage-threshold', score: covScore, detail: covDetail });
  } catch {
    results.push({ engine: 'coverage-threshold', score: 0, detail: 'not available' });
  }

  // Flaky test detection (optional, expensive)
  if (opts?.detectFlaky && testResult.total > 0) {
    try {
      const flaky = await detectFlakyTests(rootPath, opts.flakyRuns ?? 3);
      const flakyScore = flaky.totalFlaky === 0 ? 100 : Math.max(0, 100 - flaky.totalFlaky * 20);
      const flakyDetail = flaky.totalFlaky === 0
        ? 'no flaky tests detected'
        : `${flaky.totalFlaky} flaky: ${flaky.flakyTests.slice(0, 3).map(f => `${f.name} (${f.flakyRate}%)`).join(', ')}`;
      results.push({ engine: 'flaky-detection', score: flakyScore, detail: flakyDetail });
    } catch {
      results.push({ engine: 'flaky-detection', score: 50, detail: 'detection failed' });
    }
  }

  // Stryker (only if tests exist and passed)
  if (testResult.total > 0 && testResult.passed > 0) {
    try {
      const mutation = await runStryker(rootPath);
      const survivedList = mutation.details.slice(0, 3).map(d => d.mutant).join(', ');
      results.push({
        engine: 'stryker',
        score: Math.round(mutation.mutationScore),
        detail: `${mutation.killed} killed, ${mutation.survived} survived${survivedList ? ` (${survivedList})` : ''}`,
      });
    } catch {
      results.push({ engine: 'stryker', score: 0, detail: 'not configured' });
    }
  }

  const avgScore = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;
  return { engines: results.length, results, avgScore, detectedRunner: detected };
}

// IDENTITY_SEAL: PART-8 | role=unified-test | inputs=rootPath | outputs=results
