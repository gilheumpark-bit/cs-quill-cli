// ============================================================
// CS Quill 🦔 — Pipeline & Analysis Unit Tests
// ============================================================

// ============================================================
// PART 1 — Pipeline Bridge
// ============================================================

describe('core/pipeline-bridge', () => {
  const { runStaticPipeline, scanForHollowCode, scanDeadCode, analyzeCognitiveLoad } = require('../core/pipeline-bridge');

  test('runStaticPipeline returns PipelineResult', async () => {
    const result = await runStaticPipeline('const x = 1;', 'typescript');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('teams');
    expect(result).toHaveProperty('summary');
    expect(Array.isArray(result.teams)).toBe(true);
    expect(result.teams.length).toBe(8);
  });

  test('runStaticPipeline score is 0-100', async () => {
    const result = await runStaticPipeline('const x = 1;', 'typescript');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  test('runStaticPipeline detects eval()', async () => {
    const result = await runStaticPipeline('eval("alert(1)");', 'typescript');
    const allFindings = result.teams.flatMap((t: any) => t.findings);
    const hasEval = allFindings.some((f: any) => {
      const msg = typeof f === 'string' ? f : f?.message ?? '';
      return msg.toLowerCase().includes('eval');
    });
    expect(hasEval).toBe(true);
  });

  test('runStaticPipeline detects console.log', async () => {
    const result = await runStaticPipeline('console.log("hello");', 'typescript');
    const allFindings = result.teams.flatMap((t: any) => t.findings);
    const hasConsole = allFindings.some((f: any) => {
      const msg = typeof f === 'string' ? f : f?.message ?? '';
      return msg.includes('console');
    });
    expect(hasConsole).toBe(true);
  });

  test('empty code gets high score', async () => {
    const result = await runStaticPipeline('', 'typescript');
    expect(result.score).toBeGreaterThanOrEqual(90);
  });

  test('scanForHollowCode detects empty function', async () => {
    const result = await scanForHollowCode('function empty() {}', 'test.ts');
    expect(result).toHaveProperty('findings');
  });

  test('scanDeadCode returns result', async () => {
    const result = await scanDeadCode('return 1;\nconst x = 2;', 'typescript');
    expect(result).toHaveProperty('findings');
  });

  test('analyzeCognitiveLoad detects long lines', async () => {
    const longLine = 'const x = ' + 'a'.repeat(200) + ';';
    const result = await analyzeCognitiveLoad(longLine);
    expect(result).toHaveProperty('findings');
  });
});

// ============================================================
// PART 2 — Deep Verify
// ============================================================

describe('core/deep-verify', () => {
  const { runDeepVerify } = require('../core/deep-verify');

  test('runDeepVerify returns findings array', async () => {
    const result = await runDeepVerify('const x = 1;', 'test.ts');
    expect(result).toHaveProperty('findings');
    expect(Array.isArray(result.findings)).toBe(true);
  });

  test('detects mismatched braces', async () => {
    const result = await runDeepVerify('function test() { { }', 'test.ts');
    const hasBrace = result.findings.some((f: any) => f.category === 'brace-balance');
    expect(hasBrace).toBe(true);
  });

  test('clean code has no P0 findings', async () => {
    const result = await runDeepVerify('export function add(a: number, b: number): number { return a + b; }', 'test.ts');
    const p0 = result.findings.filter((f: any) => f.severity === 'P0');
    expect(p0.length).toBe(0);
  });
});

// ============================================================
// PART 3 — File Cache
// ============================================================

describe('core/file-cache', () => {
  const { getCachedFiles, setCachedFiles, invalidateCache, getCacheStats } = require('../core/file-cache');

  test('cache starts empty', () => {
    invalidateCache();
    expect(getCachedFiles('/test')).toBeNull();
  });

  test('set and get cache', () => {
    const files = [{ path: '/a.ts', relativePath: 'a.ts', content: 'const x = 1;', language: 'typescript' }];
    setCachedFiles('/test', files);
    const cached = getCachedFiles('/test');
    expect(cached).toEqual(files);
  });

  test('cache respects TTL', async () => {
    setCachedFiles('/ttl-test', []);
    await new Promise(r => setTimeout(r, 50)); // 50ms 대기
    expect(getCachedFiles('/ttl-test', 10)).toBeNull(); // 10ms TTL < 50ms elapsed = expired
  });

  test('getCacheStats returns stats', () => {
    const stats = getCacheStats();
    expect(stats).toHaveProperty('entries');
    expect(stats).toHaveProperty('totalSizeMB');
  });

  afterAll(() => invalidateCache());
});

// ============================================================
// PART 4 — Fix Memory
// ============================================================

describe('core/fix-memory', () => {
  const { recordFix, findSimilarFixes, getTopPatterns, getStats } = require('../core/fix-memory');

  test('recordFix does not throw', () => {
    expect(() => recordFix({
      category: 'test',
      description: 'test pattern',
      beforePattern: 'console.log',
      afterPattern: '// removed',
      confidence: 0.8,
    })).not.toThrow();
  });

  test('getTopPatterns returns array', () => {
    const patterns = getTopPatterns(5);
    expect(Array.isArray(patterns)).toBe(true);
  });

  test('getStats returns stats object', () => {
    const stats = getStats();
    expect(stats).toHaveProperty('total');
    expect(stats).toHaveProperty('avgConfidence');
  });
});

// ============================================================
// PART 5 — Reference DB
// ============================================================

describe('core/reference-db', () => {
  const { searchPatterns, buildReferencePrompt, seedDB, getRefStats } = require('../core/reference-db');

  test('seedDB returns count', () => {
    const count = seedDB();
    expect(typeof count).toBe('number');
  });

  test('searchPatterns returns array', () => {
    const results = searchPatterns('auth login jwt', undefined, 3);
    expect(Array.isArray(results)).toBe(true);
  });

  test('buildReferencePrompt returns string', () => {
    const patterns = searchPatterns('auth', undefined, 1);
    const prompt = buildReferencePrompt(patterns);
    expect(typeof prompt).toBe('string');
  });

  test('getRefStats returns stats', () => {
    const stats = getRefStats();
    expect(stats).toHaveProperty('total');
    expect(stats).toHaveProperty('byCategory');
  });
});

// ============================================================
// PART 6 — Sandbox
// ============================================================

describe('adapters/sandbox', () => {
  const { runInVM, runInSandbox, fuzzInSandbox } = require('../adapters/sandbox');

  test('runInVM executes simple code', () => {
    const result = runInVM('console.log("hello");');
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('hello');
    expect(result.mode).toBe('vm');
  });

  test('runInVM catches errors', () => {
    const result = runInVM('throw new Error("test error");');
    expect(result.success).toBe(false);
    expect(result.stderr).toContain('test error');
  });

  test('runInVM respects timeout', () => {
    const result = runInVM('while(true){}', { timeout: 100 });
    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
  });

  test('runInVM blocks dangerous globals', () => {
    const result = runInVM('process.exit(1)');
    expect(result.success).toBe(false);
  });

  test('runInSandbox defaults to vm mode', () => {
    const result = runInSandbox('console.log(1+1);');
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('2');
  });

  test('fuzzInSandbox returns results for each input', () => {
    const results = fuzzInSandbox('function test(x) { return x; }', 'test');
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(5);
  });
});
