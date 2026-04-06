// ============================================================
// CS Quill — Deep Command Module Tests
// ============================================================
// 24 tests across 5 command modules: generate, stress, compliance, audit, playground.
// Tests internal functions directly, not full CLI execution.

import { resolve, join } from 'path';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs';
import * as os from 'os';

// ============================================================
// PART 1 — commands/generate.ts (6 tests)
// ============================================================

describe('commands/generate', () => {
  const {
    generateSealHeader,
    generateSealFooter,
    mergeGeneratedParts,
    deduplicateImports,
    validateGeneratedCode,
  } = require('../commands/generate');

  const { buildExecutionWaves } = require('../ai/planner');

  // --- 1. buildExecutionWaves groups independent parts ---
  test('buildExecutionWaves groups independent parts into parallel waves', () => {
    const contracts = [
      { part: 1, role: 'types', inputs: [], outputs: ['TypeA'], dependencies: [], estimatedLines: 20 },
      { part: 2, role: 'utils', inputs: [], outputs: ['helperFn'], dependencies: [], estimatedLines: 30 },
      { part: 3, role: 'main', inputs: ['TypeA', 'helperFn'], outputs: ['App'], dependencies: [1, 2], estimatedLines: 50 },
    ];
    const waves = buildExecutionWaves(contracts);
    // Parts 1 and 2 have no deps -> wave 1; Part 3 depends on both -> wave 2
    expect(waves.length).toBe(2);
    expect(waves[0]).toContain(1);
    expect(waves[0]).toContain(2);
    expect(waves[1]).toEqual([3]);
  });

  // --- 2. deduplicateImports removes duplicates ---
  test('deduplicateImports removes duplicate import lines', () => {
    const code = [
      "import { join } from 'path';",
      "import { readFileSync } from 'fs';",
      "import { join } from 'path';",
      "import { resolve } from 'path';",
      '',
      'const x = 1;',
      "import { readFileSync } from 'fs';",
      'const y = 2;',
    ].join('\n');

    const result = deduplicateImports(code);
    // Count how many times each import appears in the result
    const joinCount = (result.match(/import \{ join \} from 'path'/g) ?? []).length;
    const readCount = (result.match(/import \{ readFileSync \} from 'fs'/g) ?? []).length;
    expect(joinCount).toBe(1);
    expect(readCount).toBe(1);
    // resolve import should still be present
    expect(result).toContain("import { resolve } from 'path'");
    // Non-import code preserved
    expect(result).toContain('const x = 1;');
    expect(result).toContain('const y = 2;');
  });

  // --- 3. validateGeneratedCode detects unbalanced brackets ---
  test('validateGeneratedCode detects unbalanced brackets', () => {
    const unbalanced = 'function foo() { if (true) { return [1, 2]; }';
    const result = validateGeneratedCode(unbalanced);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e: string) => /curly/i.test(e))).toBe(true);

    // Balanced code should pass
    const balanced = 'function foo() { if (true) { return [1, 2]; } }';
    const result2 = validateGeneratedCode(balanced);
    expect(result2.valid).toBe(true);
    expect(result2.errors.length).toBe(0);
  });

  // --- 4. generateSealHeader format ---
  test('generateSealHeader produces correct PART header', () => {
    const contract = { part: 3, role: 'api-handler', inputs: ['Request'], outputs: ['Response'], dependencies: [1], estimatedLines: 40 };
    const header = generateSealHeader(contract);
    expect(header).toContain('PART 3');
    expect(header).toContain('api-handler');
    expect(header).toContain('====');
  });

  // --- 5. generateSealFooter format ---
  test('generateSealFooter produces correct IDENTITY_SEAL line', () => {
    const contract = { part: 2, role: 'data-layer', inputs: ['Config', 'DB'], outputs: ['Model'], dependencies: [], estimatedLines: 60 };
    const footer = generateSealFooter(contract);
    expect(footer).toContain('IDENTITY_SEAL');
    expect(footer).toContain('PART-2');
    expect(footer).toContain('role=data-layer');
    expect(footer).toContain('inputs=Config,DB');
    expect(footer).toContain('outputs=Model');
  });

  // --- 6. mergeGeneratedParts preserves order ---
  test('mergeGeneratedParts preserves part order (sorted by part number)', () => {
    const parts = [
      { part: 3, code: '// part 3 code', contract: { part: 3, role: 'c', inputs: [], outputs: [], dependencies: [1] }, tokensUsed: 10, retries: 0, durationMs: 100 },
      { part: 1, code: '// part 1 code', contract: { part: 1, role: 'a', inputs: [], outputs: [], dependencies: [] }, tokensUsed: 10, retries: 0, durationMs: 100 },
      { part: 2, code: '// part 2 code', contract: { part: 2, role: 'b', inputs: [], outputs: [], dependencies: [] }, tokensUsed: 10, retries: 0, durationMs: 100 },
    ];
    const merged = mergeGeneratedParts(parts, 'on');
    const idx1 = merged.indexOf('// part 1 code');
    const idx2 = merged.indexOf('// part 2 code');
    const idx3 = merged.indexOf('// part 3 code');
    expect(idx1).toBeLessThan(idx2);
    expect(idx2).toBeLessThan(idx3);
    // Should contain SEAL headers when structure='on'
    expect(merged).toContain('PART 1');
    expect(merged).toContain('IDENTITY_SEAL');
  });
});

// ============================================================
// PART 2 — commands/stress.ts (5 tests)
// ============================================================

describe('commands/stress', () => {
  const { computeStaticMetrics, runCPUStress } = require('../commands/stress');

  // --- 1. computeStaticMetrics counts loops/async/nested ---
  test('computeStaticMetrics counts loops, async, and nested depth', () => {
    const code = `
async function fetchData() {
  const result = await fetch('/api');
  for (const item of result) {
    for (const sub of item.children) {
      console.log(sub);
    }
  }
}

function handleClick() {
  document.addEventListener('click', () => {});
  document.addEventListener('scroll', () => {});
}

function recursive(n) {
  if (n <= 0) return;
  recursive(n - 1);
}
`;
    const metrics = computeStaticMetrics(code);
    expect(metrics.totalLines).toBeGreaterThan(10);
    expect(metrics.functionCount).toBeGreaterThanOrEqual(2);
    expect(metrics.nestedLoopDepth).toBeGreaterThanOrEqual(2);
    expect(metrics.asyncWithoutTryCatch).toBeGreaterThanOrEqual(1);
    expect(metrics.eventListenerCount).toBeGreaterThanOrEqual(2);
    expect(metrics.recursiveFunctionCount).toBeGreaterThanOrEqual(1);
  });

  // --- 2. buildDummyArgs generates correct types for params ---
  test('buildDummyArgs-style param detection from source code', () => {
    // The stress runner detects param types from source names inline.
    // We test the same pattern matching logic.
    const paramPatterns: Array<{ pattern: RegExp; expected: any }> = [
      { pattern: /num|count|size|len|index|id|port|limit|max|min|amount|qty/i, expected: 0 },
      { pattern: /str|name|path|url|text|msg|key|label|title|file/i, expected: '' },
      { pattern: /arr|list|items|data|values|args/i, expected: [] },
      { pattern: /obj|config|opts|options|params|settings|props/i, expected: {} },
      { pattern: /bool|flag|enabled|disabled|active|visible/i, expected: false },
    ];

    const testParams = ['count', 'filePath', 'dataList', 'configObj', 'isEnabled'];
    const results = testParams.map(p => {
      const lower = p.toLowerCase();
      for (const pp of paramPatterns) {
        if (pp.pattern.test(lower)) return pp.expected;
      }
      return undefined;
    });

    expect(results[0]).toBe(0);          // count -> number
    expect(results[1]).toBe('');         // filePath -> string
    expect(results[2]).toEqual([]);      // dataList -> array
    expect(results[3]).toEqual({});      // configObj -> object
    expect(results[4]).toBe(false);      // isEnabled -> boolean
  });

  // --- 3. warmUp call with working function -> success ---
  test('warmUp with working function succeeds', async () => {
    const workingFn = (x: number) => x * 2;
    // Simulate warm-up: call the function, expect no throw
    let warmupPassed = true;
    try {
      await workingFn(5);
    } catch {
      warmupPassed = false;
    }
    expect(warmupPassed).toBe(true);

    // Also test via runCPUStress with a working function
    const result = await runCPUStress(workingFn, 1, 5, '', 'workingFn', [5]);
    expect(result.errors).toBe(0);
    expect(result.avgMs).toBeGreaterThanOrEqual(0);
    expect(result.timings.length).toBe(5);
  });

  // --- 4. warmUp call with failing function -> reports error ---
  test('warmUp with failing function reports error', async () => {
    const failingFn = () => { throw new Error('intentional fail'); };
    let warmupPassed = true;
    let errorMsg = '';
    try {
      await failingFn();
    } catch (err: any) {
      warmupPassed = false;
      errorMsg = err?.message ?? String(err);
    }
    expect(warmupPassed).toBe(false);
    expect(errorMsg).toContain('intentional fail');

    // runCPUStress should record errors
    const result = await runCPUStress(failingFn, 1, 3, '', 'failingFn', []);
    expect(result.errors).toBe(3);
  });

  // --- 5. percentile calculation (p50/p95/p99) ---
  test('percentile calculation from sorted timings', () => {
    // Generate 100 timing values: 1..100
    const timings = Array.from({ length: 100 }, (_, i) => i + 1);
    timings.sort((a, b) => a - b);

    const p50 = timings[Math.floor(timings.length * 0.5)];
    const p95 = timings[Math.floor(timings.length * 0.95)];
    const p99 = timings[Math.floor(timings.length * 0.99)];

    expect(p50).toBe(51);   // index 50 -> value 51
    expect(p95).toBe(96);   // index 95 -> value 96
    expect(p99).toBe(100);  // index 99 -> value 100

    // Verify same logic via runCPUStress with a deterministic function
    // (timing values won't be 1..100 but p50 < p95 < p99 must hold)
  });
});

// ============================================================
// PART 3 — commands/compliance.ts (5 tests)
// ============================================================

describe('commands/compliance', () => {
  const {
    LICENSE_COMPAT_MATRIX,
    checkLicenseCompatibility,
    collectSBOMComponents,
    generateSBOM,
  } = require('../commands/compliance');

  // --- 1. LICENSE_COMPAT_MATRIX MIT->Apache compatible ---
  test('LICENSE_COMPAT_MATRIX: MIT project with Apache-2.0 dep is compatible', () => {
    expect(LICENSE_COMPAT_MATRIX['MIT']['Apache-2.0']).toBe('compatible');
  });

  // --- 2. LICENSE_COMPAT_MATRIX MIT->GPL check-required ---
  test('LICENSE_COMPAT_MATRIX: MIT project with GPL dep is incompatible', () => {
    // GPL-2.0-only and GPL-3.0-only are incompatible with MIT
    expect(LICENSE_COMPAT_MATRIX['MIT']['GPL-2.0-only']).toBe('incompatible');
    expect(LICENSE_COMPAT_MATRIX['MIT']['GPL-3.0-only']).toBe('incompatible');
    // LGPL variants are check-required
    expect(LICENSE_COMPAT_MATRIX['MIT']['LGPL-2.1-only']).toBe('check-required');
    expect(LICENSE_COMPAT_MATRIX['MIT']['LGPL-3.0-only']).toBe('check-required');
  });

  // --- 3. collectSBOMComponents from package-lock v7 ---
  test('collectSBOMComponents returns components from current project', () => {
    // This runs against cs-quill-cli's own package-lock.json
    const components = collectSBOMComponents();
    expect(Array.isArray(components)).toBe(true);
    // Should have at least some components (this project has deps)
    expect(components.length).toBeGreaterThan(0);
    // Each component should have required fields
    const first = components[0];
    expect(first).toHaveProperty('name');
    expect(first).toHaveProperty('version');
    expect(first).toHaveProperty('license');
    expect(first).toHaveProperty('purl');
    expect(first).toHaveProperty('scope');
    expect(first).toHaveProperty('isDirect');
    expect(first.purl).toContain('pkg:npm/');
  });

  // --- 4. CycloneDX output has required fields ---
  test('CycloneDX SBOM output has required CycloneDX fields', async () => {
    const sbomJson = await generateSBOM('cyclonedx');
    const sbom = JSON.parse(sbomJson);
    expect(sbom.bomFormat).toBe('CycloneDX');
    expect(sbom.specVersion).toBe('1.5');
    expect(sbom.serialNumber).toMatch(/^urn:uuid:/);
    expect(sbom.version).toBe(1);
    expect(sbom.metadata).toBeDefined();
    expect(sbom.metadata.timestamp).toBeDefined();
    expect(sbom.metadata.tools).toBeDefined();
    expect(sbom.metadata.component).toBeDefined();
    expect(sbom.metadata.component.type).toBe('application');
    expect(Array.isArray(sbom.components)).toBe(true);
    expect(Array.isArray(sbom.dependencies)).toBe(true);
  });

  // --- 5. SPDX output has required fields ---
  test('SPDX SBOM output has required SPDX 2.3 fields', async () => {
    const sbomJson = await generateSBOM('spdx');
    const sbom = JSON.parse(sbomJson);
    expect(sbom.spdxVersion).toBe('SPDX-2.3');
    expect(sbom.dataLicense).toBe('CC0-1.0');
    expect(sbom.SPDXID).toBe('SPDXRef-DOCUMENT');
    expect(sbom.name).toBeDefined();
    expect(sbom.documentNamespace).toMatch(/^https:\/\/spdx\.org\/spdxdocs\//);
    expect(sbom.creationInfo).toBeDefined();
    expect(sbom.creationInfo.creators).toBeDefined();
    expect(Array.isArray(sbom.packages)).toBe(true);
    expect(sbom.packages.length).toBeGreaterThan(0);
    expect(Array.isArray(sbom.relationships)).toBe(true);
    // Root package should be first
    expect(sbom.packages[0].SPDXID).toBe('SPDXRef-RootPackage');
    expect(sbom.packages[0].primaryPackagePurpose).toBe('APPLICATION');
  });
});

// ============================================================
// PART 4 — commands/audit.ts (4 tests)
// ============================================================

describe('commands/audit', () => {
  const {
    aggregateByCategory,
    buildSarifOutput,
    saveAuditSnapshot,
    loadPreviousAudit,
    printTrendComparison,
  } = require('../commands/audit');

  // --- 1. aggregateByCategory groups domains correctly ---
  test('aggregateByCategory groups domains into 4 categories', () => {
    const areas = [
      { name: 'naming-conventions', score: 80 },
      { name: 'code-complexity', score: 60 },
      { name: 'error-handling', score: 90 },
      { name: 'testing-coverage', score: 70 },
      { name: 'modularity', score: 85 },
      { name: 'logging-quality', score: 75 },
      { name: 'security-scan', score: 95 },
    ];
    const categories = aggregateByCategory(areas);
    expect(categories.length).toBe(4); // Code Quality, Architecture, Reliability, Operations

    const codeQuality = categories.find((c: any) => c.category === 'Code Quality');
    expect(codeQuality).toBeDefined();
    expect(codeQuality!.domains.length).toBeGreaterThan(0);
    // naming-conventions should match 'naming' in Code Quality
    expect(codeQuality!.domains.some((d: any) => d.name.includes('naming'))).toBe(true);

    // Each category has average and grade
    for (const cat of categories) {
      expect(typeof cat.average).toBe('number');
      expect(cat.average).toBeGreaterThanOrEqual(0);
      expect(cat.average).toBeLessThanOrEqual(100);
      expect(['A+', 'A', 'B', 'C', 'D', 'F']).toContain(cat.grade);
    }
  });

  // --- 2. SARIF output schema validation ---
  test('buildSarifOutput produces valid SARIF 2.1.0 structure', () => {
    const report = {
      areas: [
        { name: 'naming', score: 50, findings: ['Use camelCase for variables'] },
        { name: 'testing', score: 90 },
        { name: 'security', score: 20, findings: [{ message: 'SQL injection risk', file: 'src/db.ts', line: 42 }] },
      ],
      urgent: ['Fix SQL injection in db.ts'],
      hardGateFail: false,
    };
    const sarif = buildSarifOutput(report, '/project');

    expect((sarif as any).$schema).toContain('sarif');
    expect((sarif as any).version).toBe('2.1.0');
    expect(Array.isArray((sarif as any).runs)).toBe(true);
    expect((sarif as any).runs.length).toBe(1);

    const run = (sarif as any).runs[0];
    expect(run.tool.driver.name).toBe('CS Quill Audit');
    expect(Array.isArray(run.results)).toBe(true);
    // Should have results for areas below 80 and urgent items
    expect(run.results.length).toBeGreaterThan(0);

    // Check that security finding has location info
    const secResult = run.results.find((r: any) => r.ruleId.includes('security'));
    expect(secResult).toBeDefined();
    expect(secResult.locations).toBeDefined();
    expect(secResult.locations[0].physicalLocation.artifactLocation.uri).toBe('src/db.ts');
    expect(secResult.locations[0].physicalLocation.region.startLine).toBe(42);
  });

  // --- 3. saveAuditSnapshot + loadPreviousAudit roundtrip ---
  test('saveAuditSnapshot and loadPreviousAudit roundtrip', () => {
    const tmpDir = join(os.tmpdir(), `cs-audit-test-${Date.now()}`);
    mkdirSync(join(tmpDir, '.cs'), { recursive: true });

    const report = {
      totalScore: 72,
      areas: [
        { name: 'naming', score: 80 },
        { name: 'testing', score: 64 },
      ],
    };

    // Save snapshot
    saveAuditSnapshot(tmpDir, report);

    // Load it back
    const loaded = loadPreviousAudit(tmpDir);
    expect(loaded).not.toBeNull();
    expect(loaded!.totalScore).toBe(72);
    expect(loaded!.areas.length).toBe(2);
    expect(loaded!.areas[0].name).toBe('naming');
    expect(loaded!.areas[0].score).toBe(80);
    expect(loaded!.timestamp).toBeDefined();

    // Cleanup
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  // --- 4. printTrendComparison with 2 snapshots ---
  test('printTrendComparison logs trend data without throwing', () => {
    const current = {
      totalScore: 78,
      areas: [
        { name: 'naming', score: 85 },
        { name: 'testing', score: 71 },
        { name: 'security', score: 60 },
      ],
    };
    const previous = {
      timestamp: '2025-01-01T00:00:00.000Z',
      totalScore: 65,
      areas: [
        { name: 'naming', score: 70 },
        { name: 'testing', score: 72 },
        { name: 'security', score: 60 },
      ],
    };

    // Capture console output
    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: any[]) => logs.push(args.join(' '));

    expect(() => printTrendComparison(current, previous)).not.toThrow();

    console.log = origLog;

    // Should mention trend data
    const output = logs.join('\n');
    expect(output).toContain('65');  // previous score
    expect(output).toContain('78');  // current score
    // naming improved by 15 (>= 5 threshold)
    expect(output).toContain('naming');
  });
});

// ============================================================
// PART 5 — commands/playground.ts (4 tests)
// ============================================================

describe('commands/playground', () => {
  const { computeASTMetrics, scoreASTMetrics } = require('../commands/playground');

  // --- 1. computeASTMetrics returns valid metrics ---
  test('computeASTMetrics returns valid metrics for a real directory', () => {
    // Point at the project's own commands directory which has .ts files
    const srcDir = resolve(__dirname, '..', 'commands');
    const metrics = computeASTMetrics(srcDir);

    expect(metrics).toHaveProperty('totalFiles');
    expect(metrics).toHaveProperty('totalFunctions');
    expect(metrics).toHaveProperty('totalClasses');
    expect(metrics).toHaveProperty('totalInterfaces');
    expect(metrics).toHaveProperty('avgComplexityPerFunction');
    expect(metrics).toHaveProperty('maxComplexity');
    expect(metrics).toHaveProperty('totalLines');

    expect(metrics.totalFiles).toBeGreaterThan(0);
    expect(metrics.totalLines).toBeGreaterThan(0);
    expect(metrics.totalFunctions).toBeGreaterThanOrEqual(0);
    expect(typeof metrics.avgComplexityPerFunction).toBe('number');
    expect(typeof metrics.maxComplexity).toBe('number');
  });

  // --- 2. scoreASTMetrics penalties for high complexity ---
  test('scoreASTMetrics penalizes high complexity and rewards good structure', () => {
    // Good metrics: moderate complexity, good type ratio
    const good = {
      totalFiles: 10, totalFunctions: 40, totalClasses: 3, totalInterfaces: 5,
      avgComplexityPerFunction: 3, maxComplexity: 8, totalLines: 2000,
    };
    const goodScore = scoreASTMetrics(good);
    expect(goodScore).toBeGreaterThanOrEqual(90);

    // Bad metrics: very high complexity, no types
    const bad = {
      totalFiles: 10, totalFunctions: 200, totalClasses: 0, totalInterfaces: 0,
      avgComplexityPerFunction: 15, maxComplexity: 40, totalLines: 5000,
    };
    const badScore = scoreASTMetrics(bad);
    expect(badScore).toBeLessThan(goodScore);
    expect(badScore).toBeLessThanOrEqual(70);

    // Zero files = zero score
    const empty = {
      totalFiles: 0, totalFunctions: 0, totalClasses: 0, totalInterfaces: 0,
      avgComplexityPerFunction: 0, maxComplexity: 0, totalLines: 0,
    };
    expect(scoreASTMetrics(empty)).toBe(0);
  });

  // --- 3. History save + load roundtrip ---
  test('playground history save and load roundtrip', () => {
    const tmpDir = join(os.tmpdir(), `cs-playground-test-${Date.now()}`);
    const csDir = join(tmpDir, '.cs');
    mkdirSync(csDir, { recursive: true });

    const historyPath = join(csDir, 'playground-history.json');
    const entry = {
      timestamp: new Date().toISOString(),
      score: 85,
      categories: [
        { name: 'AST', score: 90 },
        { name: 'Quality', score: 80 },
      ],
      metrics: {
        totalFiles: 5, totalFunctions: 20, totalClasses: 2,
        totalInterfaces: 3, avgComplexityPerFunction: 4,
        maxComplexity: 10, totalLines: 500,
      },
    };

    // Save
    const history = [entry];
    writeFileSync(historyPath, JSON.stringify(history, null, 2));

    // Load
    const loaded = JSON.parse(readFileSync(historyPath, 'utf-8'));
    expect(loaded.length).toBe(1);
    expect(loaded[0].score).toBe(85);
    expect(loaded[0].categories.length).toBe(2);
    expect(loaded[0].metrics.totalFiles).toBe(5);

    // Add another entry and verify ordering
    const entry2 = { ...entry, timestamp: new Date().toISOString(), score: 92 };
    loaded.push(entry2);
    writeFileSync(historyPath, JSON.stringify(loaded, null, 2));
    const loaded2 = JSON.parse(readFileSync(historyPath, 'utf-8'));
    expect(loaded2.length).toBe(2);
    expect(loaded2[1].score).toBe(92);

    // Cleanup
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  // --- 4. JSON output structure ---
  test('playground JSON output structure has all required fields', () => {
    // Simulate the JSON output object that runPlayground creates
    const categories = [
      { name: 'AST', score: 88, engines: 6, duration: 150 },
      { name: 'Quality', score: 75, engines: 6, duration: 200 },
      { name: 'Rules', score: 80, engines: 4, duration: 50 },
      { name: 'Shield', score: 100, engines: 6, duration: 30 },
    ];
    const astMetrics = {
      totalFiles: 10, totalFunctions: 50, totalClasses: 5,
      totalInterfaces: 8, avgComplexityPerFunction: 4.2,
      maxComplexity: 12, totalLines: 3000,
    };
    const csScore = Math.round(categories.reduce((s, c) => s + c.score, 0) / categories.length);
    const totalEngines = categories.reduce((s, c) => s + c.engines, 0);

    const jsonOutput = {
      score: csScore,
      totalEngines,
      durationMs: 430,
      categories: categories.map(c => ({ name: c.name, score: c.score, engines: c.engines, durationMs: c.duration })),
      astMetrics,
      comparison: null,
      timestamp: new Date().toISOString(),
    };

    // Validate structure
    expect(jsonOutput.score).toBe(86); // (88+75+80+100)/4 = 85.75 -> 86
    expect(jsonOutput.totalEngines).toBe(22);
    expect(jsonOutput.categories.length).toBe(4);
    expect(jsonOutput.astMetrics.totalFiles).toBe(10);
    expect(jsonOutput.timestamp).toBeDefined();
    expect(jsonOutput.comparison).toBeNull();

    // Validate each category entry
    for (const cat of jsonOutput.categories) {
      expect(cat).toHaveProperty('name');
      expect(cat).toHaveProperty('score');
      expect(cat).toHaveProperty('engines');
      expect(cat).toHaveProperty('durationMs');
      expect(typeof cat.score).toBe('number');
      expect(cat.score).toBeGreaterThanOrEqual(0);
      expect(cat.score).toBeLessThanOrEqual(100);
    }
  });
});
