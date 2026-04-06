// ============================================================
// CS Quill — Coverage Batch B
// ============================================================
// Targets: tui/progress.ts, commands/init.ts, commands/stress.ts, adapters/fs-adapter.ts

import { resolve, join } from 'path';
import { mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync, readdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';

// ============================================================
// PART 1 — tui/progress.ts (5 tests)
// ============================================================

describe('tui/progress', () => {
  const { progressBar, progressLine, ProgressTimer, Spinner } = require('../tui/progress');

  test('progressBar returns correct bar at 0%', () => {
    const bar = progressBar(0, 10, 10);
    expect(bar).toBe('░░░░░░░░░░');
    expect(bar.length).toBe(10);
  });

  test('progressBar returns correct bar at 50%', () => {
    const bar = progressBar(5, 10, 10);
    expect(bar).toBe('█████░░░░░');
  });

  test('progressBar returns full bar at 100%', () => {
    const bar = progressBar(10, 10, 10);
    expect(bar).toBe('██████████');
  });

  test('progressLine formats label and percentage', () => {
    const line = progressLine(3, 10, 'files');
    expect(line).toContain('3/10');
    expect(line).toContain('files');
    expect(line).toContain('30%');
  });

  test('ProgressTimer getElapsed returns formatted time string', () => {
    const timer = new ProgressTimer();
    const elapsed = timer.getElapsed();
    // Should be a short time string (ms or s)
    expect(typeof elapsed).toBe('string');
    expect(elapsed.length).toBeGreaterThan(0);
    expect(/^\d+ms$|^\d+\.\d+s$/.test(elapsed)).toBe(true);
  });
});

// ============================================================
// PART 2 — commands/init.ts (6 tests)
// ============================================================

describe('commands/init', () => {
  const { detectFrameworks, detectMonorepo, detectTestFramework } = require('../commands/init');

  describe('detectMonorepo', () => {
    const origCwd = process.cwd();
    const dirsToClean: string[] = [];

    afterEach(() => {
      process.chdir(origCwd);
      for (const d of dirsToClean) {
        try { rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ }
      }
      dirsToClean.length = 0;
    });

    test('returns type "none" when no monorepo indicators exist', () => {
      const tmpDir = join(tmpdir(), `cs-quill-mono-none-${Date.now()}`);
      mkdirSync(tmpDir, { recursive: true });
      dirsToClean.push(tmpDir);
      writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));
      process.chdir(tmpDir);

      const result = detectMonorepo();
      expect(result.type).toBe('none');
      expect(result.workspaces).toEqual([]);
    });

    test('detects npm workspaces from package.json', () => {
      const tmpDir = join(tmpdir(), `cs-quill-mono-npm-${Date.now()}`);
      mkdirSync(tmpDir, { recursive: true });
      dirsToClean.push(tmpDir);
      writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({
        name: 'root',
        workspaces: ['packages/*'],
      }));
      const pkgDir = join(tmpDir, 'packages', 'sub-a');
      mkdirSync(pkgDir, { recursive: true });
      writeFileSync(join(pkgDir, 'package.json'), JSON.stringify({ name: '@mono/sub-a' }));

      process.chdir(tmpDir);
      const result = detectMonorepo();
      expect(result.type).toBe('npm-workspaces');
      expect(result.workspaces).toContain('packages/*');
      expect(result.packages).toContain('@mono/sub-a');
    });

    test('detects turborepo via turbo.json', () => {
      const tmpDir = join(tmpdir(), `cs-quill-mono-turbo-${Date.now()}`);
      mkdirSync(tmpDir, { recursive: true });
      dirsToClean.push(tmpDir);
      writeFileSync(join(tmpDir, 'turbo.json'), '{}');
      writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({ name: 'root' }));

      process.chdir(tmpDir);
      const result = detectMonorepo();
      expect(result.type).toBe('turborepo');
    });
  });

  describe('detectTestFramework', () => {
    const origCwd = process.cwd();
    const dirsToClean: string[] = [];

    afterEach(() => {
      process.chdir(origCwd);
      for (const d of dirsToClean) {
        try { rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ }
      }
      dirsToClean.length = 0;
    });

    test('detects Jest from devDependencies', () => {
      const tmpDir = join(tmpdir(), `cs-quill-tf-jest-${Date.now()}`);
      mkdirSync(tmpDir, { recursive: true });
      dirsToClean.push(tmpDir);
      writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({
        name: 'test-proj',
        devDependencies: { jest: '^29.0.0' },
        scripts: { test: 'jest' },
      }));

      process.chdir(tmpDir);
      const result = detectTestFramework();
      expect(result.framework).toBe('Jest');
      expect(result.hasTestScript).toBe(true);
    });

    test('returns null framework when no test deps found', () => {
      const tmpDir = join(tmpdir(), `cs-quill-tf-none-${Date.now()}`);
      mkdirSync(tmpDir, { recursive: true });
      dirsToClean.push(tmpDir);
      writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({
        name: 'no-test',
        dependencies: { lodash: '^4.0.0' },
      }));

      process.chdir(tmpDir);
      const result = detectTestFramework();
      expect(result.framework).toBeNull();
    });

    test('detects Vitest from devDependencies', () => {
      const tmpDir = join(tmpdir(), `cs-quill-tf-vitest-${Date.now()}`);
      mkdirSync(tmpDir, { recursive: true });
      dirsToClean.push(tmpDir);
      writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({
        name: 'vitest-proj',
        devDependencies: { vitest: '^1.0.0' },
        scripts: { test: 'vitest run' },
      }));

      process.chdir(tmpDir);
      const result = detectTestFramework();
      expect(result.framework).toBe('Vitest');
    });
  });
});

// ============================================================
// PART 3 — commands/stress.ts (6 tests)
// ============================================================

describe('commands/stress', () => {
  const { computeStaticMetrics, renderLatencyChart, runCPUStress } = require('../commands/stress');

  describe('computeStaticMetrics', () => {
    test('counts functions correctly', () => {
      const code = `
        function add(a, b) { return a + b; }
        const mul = (x, y) => x * y;
        const sub = async (a, b) => a - b;
      `;
      const metrics = computeStaticMetrics(code);
      expect(metrics.functionCount).toBeGreaterThanOrEqual(2);
      expect(metrics.totalLines).toBeGreaterThan(0);
    });

    test('detects nested loops', () => {
      const code = `
        for (let i = 0; i < 10; i++) {
          for (let j = 0; j < 10; j++) {
            console.log(i, j);
          }
        }
      `;
      const metrics = computeStaticMetrics(code);
      expect(metrics.nestedLoopDepth).toBeGreaterThanOrEqual(2);
    });

    test('detects fetch calls', () => {
      const code = `
        const res = await fetch('/api/data');
        const data = await axios.get('/users');
      `;
      const metrics = computeStaticMetrics(code);
      expect(metrics.fetchCallCount).toBe(2);
    });

    test('returns zero metrics for empty code', () => {
      const metrics = computeStaticMetrics('');
      expect(metrics.functionCount).toBe(0);
      expect(metrics.fetchCallCount).toBe(0);
      expect(metrics.eventListenerCount).toBe(0);
    });
  });

  describe('renderLatencyChart', () => {
    test('returns "(no data)" for empty timings', () => {
      const result = renderLatencyChart([]);
      expect(result).toEqual(['  (no data)']);
    });

    test('renders valid chart lines for sample timings', () => {
      const timings = [10, 20, 30, 40, 50, 15, 25, 35, 45, 55];
      const lines = renderLatencyChart(timings, 5);
      expect(lines.length).toBeGreaterThan(1);
      expect(lines[0]).toContain('Latency Distribution');
      // Each data line should have a bar separator
      for (let i = 1; i < lines.length; i++) {
        expect(lines[i]).toContain('|');
        expect(lines[i]).toContain('ms');
      }
    });
  });

  describe('runCPUStress', () => {
    test('benchmarks a simple function with timings', async () => {
      const fn = (x: number) => x * 2;
      const result = await runCPUStress(fn, 1, 10, 'const fn = (x) => x * 2;', 'fn', [42]);
      expect(result.timings.length).toBe(10);
      expect(result.errors).toBe(0);
      expect(result.avgMs).toBeGreaterThanOrEqual(0);
      expect(result.throughput).toBeGreaterThan(0);
    });

    test('falls back to static analysis when targetFn is null', async () => {
      const code = 'function foo() { return 1; }\nconst x = 2;';
      const result = await runCPUStress(null, 1, 5, code, 'foo', []);
      expect(result.timings.length).toBe(5);
      expect(result.errors).toBe(0);
    });
  });
});

// ============================================================
// PART 4 — adapters/fs-adapter.ts (7 tests)
// ============================================================

describe('adapters/fs-adapter', () => {
  const {
    atomicWriteSync,
    createBackup,
    restoreBackup,
    listBackups,
    safeReadFile,
    safeWriteFile,
    safeDeleteFile,
  } = require('../adapters/fs-adapter');

  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `cs-quill-fs-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    try { rmSync(testDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  test('atomicWriteSync writes file and content matches', () => {
    const filePath = join(testDir, 'atomic-test.txt');
    const content = 'hello atomic world';
    atomicWriteSync(filePath, content);
    expect(existsSync(filePath)).toBe(true);
    expect(readFileSync(filePath, 'utf-8')).toBe(content);
  });

  test('atomicWriteSync creates parent directories', () => {
    const filePath = join(testDir, 'sub', 'deep', 'file.txt');
    atomicWriteSync(filePath, 'nested content');
    expect(readFileSync(filePath, 'utf-8')).toBe('nested content');
  });

  test('createBackup returns backup path for existing file', () => {
    const filePath = join(testDir, 'backup-src.txt');
    writeFileSync(filePath, 'original content');
    const backupPath = createBackup(filePath);
    expect(backupPath).not.toBeNull();
    if (backupPath) {
      expect(existsSync(backupPath)).toBe(true);
      expect(readFileSync(backupPath, 'utf-8')).toBe('original content');
    }
  });

  test('createBackup returns null for non-existent file', () => {
    const result = createBackup(join(testDir, 'nonexistent.txt'));
    expect(result).toBeNull();
  });

  test('restoreBackup restores from latest backup', () => {
    const filePath = join(testDir, 'restore-test.txt');
    writeFileSync(filePath, 'version-1');
    createBackup(filePath);
    writeFileSync(filePath, 'version-2');

    const restored = restoreBackup(filePath);
    expect(restored).toBe(true);
    expect(readFileSync(filePath, 'utf-8')).toBe('version-1');
  });

  test('safeReadFile returns content for existing file and null for missing', () => {
    const filePath = join(testDir, 'safe-read.txt');
    writeFileSync(filePath, 'safe content');
    expect(safeReadFile(filePath)).toBe('safe content');
    expect(safeReadFile(join(testDir, 'no-such-file.txt'))).toBeNull();
  });

  test('safeWriteFile writes file and returns success', () => {
    const filePath = join(testDir, 'safe-write.txt');
    const result = safeWriteFile(filePath, 'safe written');
    expect(result.success).toBe(true);
    expect(readFileSync(filePath, 'utf-8')).toBe('safe written');
  });
});
