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
// PART 4 — Unified Test Runner
// ============================================================

export async function runFullTestAnalysis(rootPath: string) {
  const results: Array<{ engine: string; score: number; detail: string }> = [];

  // Vitest/Jest
  const testResult = await runVitest(rootPath);
  const testScore = testResult.total > 0 ? Math.round((testResult.passed / testResult.total) * 100) : 0;
  const failDetail = testResult.failures.length > 0
    ? ` — ${testResult.failures[0].name}: ${testResult.failures[0].error.slice(0, 60)}`
    : '';
  results.push({ engine: 'vitest/jest', score: testScore, detail: `${testResult.passed}/${testResult.total} passed${failDetail}` });

  // Stryker (only if tests exist)
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
  return { engines: results.length, results, avgScore };
}

// IDENTITY_SEAL: PART-4 | role=unified-test | inputs=rootPath | outputs=results
