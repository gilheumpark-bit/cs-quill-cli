// coverage-batch-a.test.ts — boost coverage for the 4 lowest-coverage files
// targets: commands/preset.ts, adapters/test-engine.ts, commands/ip-scan.ts, adapters/git-enhanced.ts

export {};
const path = require('path');
const fs = require('fs');
const os = require('os');

// ============================================================
// 1. commands/preset.ts  (8 tests)
// ============================================================

// We need to mock getGlobalConfigDir before requiring preset
jest.mock('../core/config', () => ({
  getGlobalConfigDir: () => path.join(os.tmpdir(), 'cs-quill-test-presets-' + process.pid),
}));

// We also mock core/session used in ip-scan
jest.mock('../core/session', () => ({
  recordCommand: jest.fn(),
}));

describe('commands/preset', () => {
  const presetMod = require('../commands/preset');
  const { runPreset, getPresetsForFramework, buildPresetDirective } = presetMod;

  const tmpPresetDir = path.join(
    require('../core/config').getGlobalConfigDir(),
    'presets',
  );

  afterAll(() => {
    // cleanup
    try { fs.rmSync(tmpPresetDir, { recursive: true, force: true }); } catch {}
    try { fs.rmSync(path.dirname(tmpPresetDir), { recursive: true, force: true }); } catch {}
  });

  test('runPreset list prints built-in presets', async () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await runPreset('list');
    const output = spy.mock.calls.map(c => c.join(' ')).join('\n');
    expect(output).toContain('react-19');
    expect(output).toContain('typescript-5');
    spy.mockRestore();
  });

  test('runPreset show displays preset details', async () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await runPreset('show', ['react-19']);
    const output = spy.mock.calls.map(c => c.join(' ')).join('\n');
    expect(output).toContain('React');
    expect(output).toContain('forwardRef');
    spy.mockRestore();
  });

  test('runPreset show with unknown name warns', async () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await runPreset('show', ['nonexistent-preset']);
    const output = spy.mock.calls.map(c => c.join(' ')).join('\n');
    expect(output).toContain('nonexistent-preset');
    spy.mockRestore();
  });

  test('runPreset install creates preset JSON file', async () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await runPreset('install', ['tailwind-4']);
    expect(fs.existsSync(path.join(tmpPresetDir, 'tailwind-4.json'))).toBe(true);
    const content = JSON.parse(fs.readFileSync(path.join(tmpPresetDir, 'tailwind-4.json'), 'utf-8'));
    expect(content.framework).toBe('Tailwind CSS');
    spy.mockRestore();
  });

  test('runPreset remove deletes installed preset', async () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    // Install first
    await runPreset('install', ['next-16']);
    expect(fs.existsSync(path.join(tmpPresetDir, 'next-16.json'))).toBe(true);
    // Remove
    await runPreset('remove', ['next-16']);
    expect(fs.existsSync(path.join(tmpPresetDir, 'next-16.json'))).toBe(false);
    spy.mockRestore();
  });

  test('runPreset remove for non-installed preset warns', async () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await runPreset('remove', ['not-installed']);
    const output = spy.mock.calls.map(c => c.join(' ')).join('\n');
    expect(output).toContain('not-installed');
    spy.mockRestore();
  });

  test('getPresetsForFramework returns matching presets', () => {
    const results = getPresetsForFramework('react');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].framework).toBe('React');
  });

  test('buildPresetDirective formats output correctly', () => {
    const preset = {
      name: 'test', version: '1.0', framework: 'TestFW', frameworkVersion: '1.x',
      createdAt: 0,
      rules: {
        patterns: ['use X'], antiPatterns: ['avoid Y'],
        deprecated: ['old Z'], conventions: ['do W'],
      },
    };
    const output = buildPresetDirective([preset]);
    expect(output).toContain('[Framework Presets]');
    expect(output).toContain('USE: use X');
    expect(output).toContain('AVOID: avoid Y');
    expect(output).toContain('DEPRECATED: old Z');
  });
});

// ============================================================
// 2. adapters/test-engine.ts  (6 tests)
// ============================================================

describe('adapters/test-engine', () => {
  const testEngine = require('../adapters/test-engine');
  const { detectTestRunner, enforceCoverageThresholds } = testEngine;

  test('detectTestRunner returns jest when jest.config.js exists', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'te-jest-'));
    fs.writeFileSync(path.join(tmp, 'jest.config.js'), 'module.exports = {};');
    const result = detectTestRunner(tmp);
    expect(result.runner).toBe('jest');
    expect(result.configFile).toBe('jest.config.js');
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test('detectTestRunner returns vitest when vitest.config.ts exists', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'te-vitest-'));
    fs.writeFileSync(path.join(tmp, 'vitest.config.ts'), 'export default {};');
    const result = detectTestRunner(tmp);
    expect(result.runner).toBe('vitest');
    expect(result.configFile).toBe('vitest.config.ts');
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test('detectTestRunner returns mocha when .mocharc.yml exists', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'te-mocha-'));
    fs.writeFileSync(path.join(tmp, '.mocharc.yml'), 'spec: test/**');
    const result = detectTestRunner(tmp);
    expect(result.runner).toBe('mocha');
    expect(result.configFile).toBe('.mocharc.yml');
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test('detectTestRunner returns unknown for empty dir', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'te-empty-'));
    const result = detectTestRunner(tmp);
    expect(result.runner).toBe('unknown');
    expect(result.configFile).toBeNull();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test('detectTestRunner detects jest from package.json devDependencies', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'te-pkgjest-'));
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({
      devDependencies: { jest: '^29.0.0' },
    }));
    const result = detectTestRunner(tmp);
    expect(result.runner).toBe('jest');
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test('enforceCoverageThresholds reads coverage-summary.json', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'te-cov-'));
    const covDir = path.join(tmp, 'coverage');
    fs.mkdirSync(covDir);
    fs.writeFileSync(path.join(covDir, 'coverage-summary.json'), JSON.stringify({
      total: {
        lines: { pct: 85 },
        branches: { pct: 72 },
        functions: { pct: 90 },
        statements: { pct: 88 },
      },
    }));
    const result = await enforceCoverageThresholds(tmp, {
      lines: 80, branches: 70, functions: 80, statements: 80,
    });
    expect(result.passed).toBe(true);
    expect(result.actual.lines).toBe(85);
    expect(result.failures).toHaveLength(0);
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

// ============================================================
// 3. commands/ip-scan.ts  (6 tests)
// ============================================================

describe('commands/ip-scan', () => {
  const ipScan = require('../commands/ip-scan');
  const { SPDX_LICENSE_DB, matchLicense, scanDependencyLicenses, calculateIPScore } = ipScan;

  test('matchLicense returns correct SPDX entry for MIT', () => {
    const result = matchLicense('MIT');
    expect(result).not.toBeNull();
    expect(result!.spdxId).toBe('MIT');
    expect(result!.riskTier).toBe('permissive');
    expect(result!.copyleft).toBe(false);
  });

  test('matchLicense identifies GPL-3.0 as strong-copyleft', () => {
    const result = matchLicense('GPL-3.0-only');
    expect(result).not.toBeNull();
    expect(result!.riskTier).toBe('strong-copyleft');
    expect(result!.copyleft).toBe(true);
    expect(result!.commercialOk).toBe(false);
  });

  test('matchLicense returns null for unknown license', () => {
    const result = matchLicense('MyCustomLicense-1.0');
    expect(result).toBeNull();
  });

  test('SPDX_LICENSE_DB contains permissive, copyleft, and restrictive entries', () => {
    const tiers = new Set(SPDX_LICENSE_DB.map((l: any) => l.riskTier));
    expect(tiers.has('permissive')).toBe(true);
    expect(tiers.has('strong-copyleft')).toBe(true);
    expect(tiers.has('restrictive')).toBe(true);
    expect(tiers.has('public-domain')).toBe(true);
  });

  test('scanDependencyLicenses reads package-lock.json', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ip-scan-'));
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({
      dependencies: { lodash: '^4.17.21' },
    }));
    fs.writeFileSync(path.join(tmp, 'package-lock.json'), JSON.stringify({
      lockfileVersion: 3,
      packages: {
        '': { name: 'test-project', version: '1.0.0' },
        'node_modules/lodash': { version: '4.17.21', license: 'MIT' },
        'node_modules/some-gpl': { version: '1.0.0', license: 'GPL-3.0-only' },
      },
    }));
    const result = scanDependencyLicenses(tmp);
    expect(result.length).toBe(2);
    const lodash = result.find((d: any) => d.name === 'lodash');
    expect(lodash).toBeDefined();
    expect(lodash!.spdxId).toBe('MIT');
    expect(lodash!.isDirect).toBe(true);
    const gpl = result.find((d: any) => d.name === 'some-gpl');
    expect(gpl!.riskTier).toBe('strong-copyleft');
    expect(gpl!.isDirect).toBe(false);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test('calculateIPScore computes weighted score correctly', () => {
    const findings = [
      { file: 'a.ts', line: 1, description: 'patent', severity: 'critical' as const },
      { file: 'b.ts', line: 2, description: 'copied', severity: 'warning' as const },
      { file: 'c.ts', line: 3, description: 'SO ref', severity: 'info' as const },
    ];
    const deps = [
      { name: 'x', version: '1', license: 'GPL-3.0', spdxId: 'GPL-3.0-only', copyleft: true, riskTier: 'strong-copyleft', isDirect: true, dependencyPath: ['x'] },
      { name: 'y', version: '1', license: 'MIT', spdxId: 'MIT', copyleft: false, riskTier: 'permissive', isDirect: true, dependencyPath: ['y'] },
      { name: 'z', version: '1', license: 'Unknown', spdxId: 'NOASSERTION', copyleft: false, riskTier: 'permissive', isDirect: false, dependencyPath: ['z'] },
    ];
    const score = calculateIPScore(findings, deps);
    // 100 - 20(critical) - 5(warning) - 1(info) - 15(strong-copyleft) - 3(unknown) = 56
    expect(score.total).toBe(56);
    expect(score.grade).toBe('C');
    expect(score.breakdown.criticalFindings).toBe(1);
    expect(score.breakdown.strongCopyleft).toBe(1);
    expect(score.breakdown.unknownLicenses).toBe(1);
  });
});

// ============================================================
// 4. adapters/git-enhanced.ts  (6 tests)
// ============================================================

// Mock child_process.execSync for git commands
jest.mock('child_process', () => {
  const original = jest.requireActual('child_process');
  return {
    ...original,
    execSync: jest.fn(original.execSync),
  };
});

describe('adapters/git-enhanced', () => {
  const gitEnhanced = require('../adapters/git-enhanced');
  const { execSync } = require('child_process');

  const {
    resolveConflictRule,
    resolveAllConflicts,
    getFileBlame,
    getBranchAnalytics,
    getHotFiles,
    suggestBranchName,
  } = gitEnhanced;

  beforeEach(() => {
    (execSync as jest.Mock).mockReset();
  });

  test('resolveConflictRule with ours strategy returns ours content', () => {
    const conflict = { startLine: 1, ours: 'const a = 1;', theirs: 'const a = 2;', endLine: 5 };
    expect(resolveConflictRule(conflict, 'ours')).toBe('const a = 1;');
  });

  test('resolveConflictRule with theirs strategy returns theirs content', () => {
    const conflict = { startLine: 1, ours: 'const a = 1;', theirs: 'const a = 2;', endLine: 5 };
    expect(resolveConflictRule(conflict, 'theirs')).toBe('const a = 2;');
  });

  test('resolveConflictRule with both strategy merges both', () => {
    const conflict = { startLine: 1, ours: 'line1', theirs: 'line2', endLine: 5 };
    expect(resolveConflictRule(conflict, 'both')).toBe('line1\nline2');
  });

  test('resolveAllConflicts returns empty when no conflicts', async () => {
    (execSync as jest.Mock).mockImplementation(() => '');
    const result = await resolveAllConflicts('/fake/path', 'ours');
    expect(result).toEqual([]);
  });

  test('getFileBlame parses porcelain blame output', () => {
    const blamePorcelain = [
      'abc1234567890abcdef1234567890abcdef123456 1 1 1',
      'author John Doe',
      'author-mail <john@example.com>',
      `author-time ${Math.floor(Date.now() / 1000)}`,
      'author-tz +0000',
      'committer John Doe',
      'summary initial commit',
      'filename test.ts',
      '\tconst x = 1;',
    ].join('\n');

    (execSync as jest.Mock).mockImplementation((cmd: string) => {
      if (cmd.includes('git blame')) return blamePorcelain;
      throw new Error('unexpected cmd');
    });

    const result = getFileBlame('/fake', 'test.ts');
    expect(result).not.toBeNull();
    expect(result!.totalLines).toBeGreaterThanOrEqual(1);
    expect(result!.authorDistribution.length).toBeGreaterThanOrEqual(1);
    expect(result!.authorDistribution[0].author).toBe('John Doe');
  });

  test('getHotFiles parses git log and sorts by churnScore', () => {
    const gitLogOutput = [
      'COMMIT_SEP|Alice|2025-04-01 10:00:00 +0000',
      'src/index.ts',
      'src/utils.ts',
      'COMMIT_SEP|Bob|2025-04-02 10:00:00 +0000',
      'src/index.ts',
      'COMMIT_SEP|Alice|2025-04-03 10:00:00 +0000',
      'src/index.ts',
      'src/other.ts',
    ].join('\n');

    (execSync as jest.Mock).mockImplementation((cmd: string) => {
      if (cmd.includes('git log')) return gitLogOutput;
      throw new Error('unexpected cmd');
    });

    const result = getHotFiles('/fake', 60, 10);
    expect(result.length).toBeGreaterThanOrEqual(1);
    // src/index.ts should be first (3 commits, 2 authors => churnScore = 3 * 1.5 = 4.5)
    expect(result[0].file).toBe('src/index.ts');
    expect(result[0].commits).toBe(3);
    expect(result[0].authors).toBe(2);
    expect(result[0].churnScore).toBe(4.5);
  });

  test('suggestBranchName generates correct prefixes', () => {
    expect(suggestBranchName('fix login bug')).toMatch(/^fix\//);
    expect(suggestBranchName('add new feature')).toMatch(/^feat\//);
    expect(suggestBranchName('refactor auth module')).toMatch(/^refactor\//);
    expect(suggestBranchName('update docs for API')).toMatch(/^docs\//);
  });

  test('getBranchAnalytics returns structure on exec failure', () => {
    (execSync as jest.Mock).mockImplementation(() => { throw new Error('not a git repo'); });
    const result = getBranchAnalytics('/fake');
    expect(result.totalBranches).toBe(0);
    expect(result.recommendations).toEqual([]);
    expect(result.branchDetails).toEqual([]);
  });
});
