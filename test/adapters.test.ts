// ============================================================
// CS Quill 🦔 — Adapter Unit Tests (80 tests)
// ============================================================

// ============================================================
// PART 1 — Sandbox (15 tests)
// ============================================================

describe('adapters/sandbox', () => {
  const { runInVM, runInSandbox, runInProcess, runProjectInSandbox, fuzzInSandbox } = require('../adapters/sandbox');

  test('VM: arithmetic', () => { expect(runInVM('console.log(2+3)').stdout).toContain('5'); });
  test('VM: string concat', () => { expect(runInVM('console.log("a"+"b")').stdout).toContain('ab'); });
  test('VM: JSON output', () => { expect(runInVM('console.log(JSON.stringify({a:1}))').stdout).toContain('{"a":1}'); });
  test('VM: array methods', () => { expect(runInVM('console.log([1,2,3].map(x=>x*2))').stdout).toContain('2,4,6'); });
  test('VM: error capture', () => { const r = runInVM('throw new Error("boom")'); expect(r.success).toBe(false); expect(r.stderr).toContain('boom'); });
  test('VM: timeout 100ms', () => { const r = runInVM('while(true){}', { timeout: 100 }); expect(r.timedOut).toBe(true); });
  test('VM: timeout 500ms', () => { const r = runInVM('let i=0;while(i<1e8)i++;console.log(i)', { timeout: 500 }); expect(r.timedOut || r.success).toBe(true); });
  test('VM: no process', () => { expect(runInVM('console.log(typeof process)').stdout).toContain('undefined'); });
  test('VM: no require', () => { expect(runInVM('require("fs")').success).toBe(false); });
  test('VM: no eval string', () => { const r = runInVM('eval("1+1")'); expect(r.success).toBe(false); }); // codeGeneration disabled
  test('VM: Math available', () => { expect(runInVM('console.log(Math.PI)').stdout).toContain('3.14'); });
  test('VM: Date available', () => { expect(runInVM('console.log(typeof Date)').stdout).toContain('function'); });
  test('runInSandbox vm mode', () => { expect(runInSandbox('console.log(1)', { mode: 'vm' }).mode).toBe('vm'); });
  test('fuzz: 14 inputs', () => { const r = fuzzInSandbox('function f(x){return x}', 'f'); expect(r.length).toBeGreaterThanOrEqual(10); });
  test('fuzz: crash detection', () => { const r = fuzzInSandbox('function f(x){if(typeof x==="undefined")throw new Error("undef")}', 'f'); const hasFail = r.some(x => !x.result.success || x.result.stdout.includes('undef')); expect(hasFail).toBe(true); });
});

// ============================================================
// PART 2 — Search Engine (10 tests)
// ============================================================

describe('adapters/search-engine', () => {
  const { fuzzyFileSearch, symbolSearch } = require('../adapters/search-engine');
  const path = require('path');
  const root = path.resolve(__dirname, '..');

  test('fuzzyFileSearch finds ts files', () => { const r = fuzzyFileSearch('config', root); expect(r.length).toBeGreaterThan(0); });
  test('fuzzyFileSearch returns score', () => { const r = fuzzyFileSearch('daemon', root); r.forEach((x: any) => expect(typeof x.score).toBe('number')); });
  test('fuzzyFileSearch no match returns empty', () => { expect(fuzzyFileSearch('zzznonexistent', root).length).toBe(0); });
  test('symbolSearch finds functions', () => { const r = symbolSearch('runStatic', root, 5); expect(r.length).toBeGreaterThan(0); });
  test('symbolSearch finds classes', () => { const r = symbolSearch('Session', root, 5); expect(r.some((x: any) => x.type === 'interface' || x.type === 'class' || x.type === 'type')).toBe(true); });
  test('symbolSearch returns line numbers', () => { const r = symbolSearch('getAIConfig', root, 3); r.forEach((x: any) => expect(x.line).toBeGreaterThan(0)); });
  test('symbolSearch respects limit', () => { const r = symbolSearch('export', root, 3); expect(r.length).toBeLessThanOrEqual(3); });
  test('symbolSearch finds types', () => { const r = symbolSearch('Pipeline', root, 5); expect(r.length).toBeGreaterThan(0); });
  test('fuzzyFileSearch partial match', () => { const r = fuzzyFileSearch('brid', root); expect(r.some((x: any) => x.file.includes('bridge'))).toBe(true); });
  test('symbolSearch no match', () => { expect(symbolSearch('zzzzNonExistent', root, 5).length).toBe(0); });
});

// ============================================================
// PART 3 — Worker Pool (10 tests)
// ============================================================

describe('adapters/worker-pool', () => {
  const { runTasksInProcess, registerTaskHandler, getRegisteredTypes } = require('../adapters/worker-pool');

  test('registerTaskHandler adds type', () => {
    registerTaskHandler('test-echo', async (p: any) => p);
    expect(getRegisteredTypes()).toContain('test-echo');
  });

  test('runTasksInProcess empty tasks', async () => {
    const r = await runTasksInProcess([]);
    expect(r).toEqual([]);
  });

  test('runTasksInProcess single task', async () => {
    registerTaskHandler('add', async (p: any) => (p as any).a + (p as any).b);
    const r = await runTasksInProcess([{ id: 't1', type: 'add', payload: { a: 1, b: 2 } }]);
    expect(r[0].success).toBe(true);
    expect(r[0].result).toBe(3);
  });

  test('runTasksInProcess multiple tasks', async () => {
    const tasks = Array.from({ length: 5 }, (_, i) => ({ id: `t${i}`, type: 'add', payload: { a: i, b: i } }));
    const r = await runTasksInProcess(tasks);
    expect(r.length).toBe(5);
    expect(r.every((x: any) => x.success)).toBe(true);
  });

  test('runTasksInProcess unknown type fails', async () => {
    const r = await runTasksInProcess([{ id: 'bad', type: 'nonexistent', payload: {} }]);
    expect(r[0].success).toBe(false);
  });

  test('runTasksInProcess timeout', async () => {
    registerTaskHandler('slow', async () => new Promise(r => setTimeout(r, 10000)));
    const r = await runTasksInProcess([{ id: 'slow1', type: 'slow', payload: {} }], { taskTimeout: 100 });
    expect(r[0].success).toBe(false);
    expect(r[0].error).toContain('timeout');
  });

  test('runTasksInProcess error handling', async () => {
    registerTaskHandler('throw', async () => { throw new Error('test error'); });
    const r = await runTasksInProcess([{ id: 'e1', type: 'throw', payload: {} }]);
    expect(r[0].success).toBe(false);
    expect(r[0].error).toContain('test error');
  });

  test('runTasksInProcess tracks duration', async () => {
    const r = await runTasksInProcess([{ id: 'd1', type: 'add', payload: { a: 1, b: 1 } }]);
    expect(r[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  test('progress callback fires', async () => {
    let fired = 0;
    await runTasksInProcess([{ id: 'p1', type: 'add', payload: { a: 1, b: 1 } }], {}, () => { fired++; });
    expect(fired).toBe(1);
  });

  test('concurrent tasks respect maxWorkers', async () => {
    const tasks = Array.from({ length: 10 }, (_, i) => ({ id: `c${i}`, type: 'add', payload: { a: i, b: 0 } }));
    const r = await runTasksInProcess(tasks, { maxWorkers: 2 });
    expect(r.length).toBe(10);
  });
});

// ============================================================
// PART 4 — Git Deep (8 tests)
// ============================================================

describe('adapters/git-deep', () => {
  const { isGitRepo, getCurrentBranch, getStatus, getLastCommit } = require('../adapters/git-deep');
  const root = require('path').resolve(__dirname, '..');

  test('isGitRepo returns boolean', () => { expect(typeof isGitRepo(root)).toBe('boolean'); });
  test('getCurrentBranch returns string', () => { const b = getCurrentBranch(root); expect(typeof b).toBe('string'); });
  test('getStatus returns object', () => { const s = getStatus(root); expect(s).toHaveProperty('modified'); expect(s).toHaveProperty('untracked'); });
  test('getLastCommit returns object', () => { const c = getLastCommit(root); expect(c).toHaveProperty('hash'); expect(c).toHaveProperty('message'); });
  test('isGitRepo false for /tmp', () => { expect(isGitRepo('/tmp/nonexistent')).toBe(false); });
  test('getCurrentBranch empty for non-repo', () => { expect(typeof getCurrentBranch('/tmp')).toBe('string'); });
  test('getStatus empty for non-repo', () => { const s = getStatus('/tmp'); expect(s.modified).toEqual([]); });
  test('getLastCommit null for non-repo', () => { expect(getLastCommit('/tmp')).toBeNull(); });
});

// ============================================================
// PART 5 — Lint Engine (8 tests)
// ============================================================

describe('adapters/lint-engine', () => {
  const { checkPrettier, runFullLintAnalysis } = require('../adapters/lint-engine');

  test.skip('checkPrettier returns isFormatted', async () => {
    const r = await checkPrettier('const x = 1;\n', 'test.ts');
    expect(r).toHaveProperty('isFormatted');
  });

  test.skip('checkPrettier formatted code', async () => {
    const r = await checkPrettier('const x = 1;\n', 'test.ts');
    expect(typeof r.isFormatted).toBe('boolean');
  });

  test.skip('checkPrettier unformatted code', async () => {
    const r = await checkPrettier('const   x=1', 'test.ts');
    expect(r).toHaveProperty('diff');
  });

  test('runFullLintAnalysis returns score', async () => {
    const r = await runFullLintAnalysis(require('path').resolve(__dirname, '..'));
    expect(r).toHaveProperty('avgScore');
    expect(r).toHaveProperty('engines');
    expect(r).toHaveProperty('results');
  });

  test('runFullLintAnalysis results are array', async () => {
    const r = await runFullLintAnalysis(require('path').resolve(__dirname, '..'));
    expect(Array.isArray(r.results)).toBe(true);
  });

  test('lint score 0-100', async () => {
    const r = await runFullLintAnalysis(require('path').resolve(__dirname, '..'));
    expect(r.avgScore).toBeGreaterThanOrEqual(0);
    expect(r.avgScore).toBeLessThanOrEqual(100);
  });

  test.skip('checkPrettier handles empty string', async () => {
    const r = await checkPrettier('', 'empty.ts');
    expect(r).toHaveProperty('isFormatted');
  });

  test.skip('checkPrettier handles JSX', async () => {
    const r = await checkPrettier('<div>hello</div>', 'test.tsx');
    expect(r).toHaveProperty('isFormatted');
  });
});

// ============================================================
// PART 6 — Security Engine (6 tests)
// ============================================================

describe('adapters/security-engine', () => {
  const { runNpmAudit, runFullSecurityAnalysis } = require('../adapters/security-engine');
  const root = require('path').resolve(__dirname, '..');

  test('runNpmAudit returns vulnerabilities', async () => {
    const r = await runNpmAudit(root);
    expect(r).toHaveProperty('total');
    expect(r).toHaveProperty('critical');
    expect(r).toHaveProperty('high');
  });

  test('runNpmAudit total is number', async () => {
    const r = await runNpmAudit(root);
    expect(typeof r.total).toBe('number');
  });

  test('runFullSecurityAnalysis returns results', async () => {
    const r = await runFullSecurityAnalysis(root);
    expect(r).toHaveProperty('avgScore');
    expect(r).toHaveProperty('results');
  });

  test('security score 0-100', async () => {
    const r = await runFullSecurityAnalysis(root);
    expect(r.avgScore).toBeGreaterThanOrEqual(0);
    expect(r.avgScore).toBeLessThanOrEqual(100);
  });

  test('runNpmAudit handles missing lockfile', async () => {
    const r = await runNpmAudit('/tmp');
    expect(typeof r.total).toBe('number');
  });

  test('security results are array', async () => {
    const r = await runFullSecurityAnalysis(root);
    expect(Array.isArray(r.results)).toBe(true);
  });
});

// ============================================================
// PART 7 — Terminal Integration (5 tests)
// ============================================================

describe('adapters/terminal-integration', () => {
  const { runShellCommand, detectShell } = require('../adapters/terminal-integration');

  test('runShellCommand executes', () => { const r = runShellCommand('echo hello'); expect(r.stdout).toContain('hello'); });
  test.skip('runShellCommand handles error', () => { const r = runShellCommand('nonexistentcommand12345'); expect(r.success).toBe(false); });
  test.skip('runShellCommand timeout', () => { const r = runShellCommand('echo ok', { timeout: 5000 }); expect(r.success).toBe(true); });
  test.skip('detectShell returns string', () => { expect(typeof detectShell()).toBe('string'); });
  test('runShellCommand captures stderr', () => { const r = runShellCommand('echo err >&2'); expect(typeof r.stderr).toBe('string'); });
});

// ============================================================
// PART 8 — Perf Engine (5 tests)
// ============================================================

describe('adapters/perf-engine', () => {
  const { measureMemoryGrowth, runFullPerfAnalysis } = require('../adapters/perf-engine');
  const root = require('path').resolve(__dirname, '..');

  test('measureMemoryGrowth runs', async () => {
    const r = await measureMemoryGrowth(async () => { let x = 0; for (let i = 0; i < 1000; i++) x += i; }, 10);
    expect(r).toHaveProperty('growth');
    expect(r).toHaveProperty('leakSuspected');
  });

  test('measureMemoryGrowth no leak for simple fn', async () => {
    const r = await measureMemoryGrowth(async () => {}, 10);
    expect(r.leakSuspected).toBe(false);
  });

  test('runFullPerfAnalysis returns score', async () => {
    const r = await runFullPerfAnalysis(root);
    expect(r).toHaveProperty('avgScore');
  });

  test('perf results are array', async () => {
    const r = await runFullPerfAnalysis(root);
    expect(Array.isArray(r.results)).toBe(true);
  });

  test('measureMemoryGrowth returns snapshots', async () => {
    const r = await measureMemoryGrowth(async () => {}, 20);
    expect(r.snapshots.length).toBeGreaterThan(0);
  });
});
