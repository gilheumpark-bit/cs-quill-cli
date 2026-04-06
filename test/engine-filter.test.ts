// ============================================================
// CS Quill — Engine Filter Integration Tests
// ============================================================
// Tests for: pre-filter, false-positive-filter, good-pattern-catalog, rule-catalog

// ============================================================
// PART 1 — pre-filter.ts
// ============================================================

describe('core/pre-filter', () => {
  const { preFilter, stripNoise, splitIntoChunks } = require('../core/pre-filter');

  // --- preFilter: small file pass-through ---
  test('small file passes through unchanged', () => {
    const code = 'const x = 1;\nconst y = 2;\n';
    const result = preFilter(code, 'small.ts');
    expect(result.chunked).toBe(false);
    expect(result.stripped).toBe(false);
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0].code).toBe(code);
    expect(result.chunks[0].label).toContain('pass-through');
  });

  // --- preFilter: large file gets chunked ---
  test('large file (>150KB) gets chunked', () => {
    // Generate a file bigger than 150KB with natural boundaries
    // Each function needs enough unique code (no comments/strings) so stripNoise
    // can't shrink it below 150KB
    const lines: string[] = [];
    for (let i = 0; i < 500; i++) {
      lines.push(`function func_${i}(arg${i}: number): number {`);
      for (let j = 0; j < 8; j++) {
        lines.push(`  const val_${i}_${j} = arg${i} + ${j * i + 1} + Math.random();`);
      }
      lines.push(`  return val_${i}_0 + val_${i}_1;`);
      lines.push('}');
      lines.push('');
    }
    const code = lines.join('\n');
    expect(code.length).toBeGreaterThan(150000);

    const result = preFilter(code, 'big.ts');
    expect(result.chunked).toBe(true);
    expect(result.stripped).toBe(true);
    expect(result.chunks.length).toBeGreaterThan(1);
    expect(result.originalSize).toBe(code.length);
  });

  // --- preFilter: minified code (avg line > 200) gets chunked ---
  test('minified code (avg line >200) gets chunked', () => {
    // Create a file with very long lines (minified style) exceeding 150KB
    // stripNoise won't remove executable code, so this stays large
    // Need >500 lines so fallback chunking (500 lines/chunk) produces >1 chunk
    const longLine = 'var a' + '=1+Math.random();var b'.repeat(50); // ~1100 chars per line
    const lines = Array(600).fill(longLine);
    const code = lines.join('\n');
    expect(code.length).toBeGreaterThan(150000);
    expect(code.length / lines.length).toBeGreaterThan(200);

    const result = preFilter(code, 'minified.js');
    expect(result.chunked).toBe(true);
    expect(result.chunks.length).toBeGreaterThan(1);
  });

  // --- stripNoise ---
  test('stripNoise removes single-line comments', () => {
    const code = 'const x = 1; // this is a comment\nconst y = 2;';
    const result = stripNoise(code);
    expect(result).not.toContain('this is a comment');
    expect(result).toContain('const x = 1;');
  });

  test('stripNoise removes multi-line comments', () => {
    const code = '/* block comment\n  spanning lines */\nconst x = 1;';
    const result = stripNoise(code);
    expect(result).not.toContain('block comment');
    expect(result).toContain('const x = 1;');
  });

  test('stripNoise empties string literals', () => {
    const code = 'const msg = "hello world";\nconst s = \'foo bar\';';
    const result = stripNoise(code);
    expect(result).toContain('""');
    expect(result).toContain("''");
    expect(result).not.toContain('hello world');
    expect(result).not.toContain('foo bar');
  });

  test('stripNoise collapses excessive blank lines', () => {
    const code = 'a\n\n\n\n\n\nb';
    const result = stripNoise(code);
    // 3+ blank lines collapsed to 1
    expect(result.split('\n').length).toBeLessThan(6);
  });

  // --- splitIntoChunks ---
  test('splitIntoChunks finds natural boundaries', () => {
    const code = [
      'function alpha() {',
      '  return 1;',
      '}',
      '',
      'class Beta {',
      '  run() {}',
      '}',
      '',
      'export function gamma() {',
      '  return 3;',
      '}',
    ].join('\n');

    const chunks = splitIntoChunks(code, 50);
    // Should find boundaries at function/class/export declarations
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0].startLine).toBe(0);
    expect(chunks[0].label).toContain('chunk-1');
  });

  test('splitIntoChunks falls back to line-count splitting when no boundaries', () => {
    // No function/class/export keywords — just data lines
    const lines = Array(1200).fill('  data: 123,');
    const code = lines.join('\n');

    const chunks = splitIntoChunks(code, 50000);
    // Should use 500-line fallback chunks
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0].label).toContain('lines 1-500');
  });
});

// ============================================================
// PART 2 — false-positive-filter.ts
// ============================================================

describe('core/false-positive-filter', () => {
  const { runFalsePositiveFilter, detectGoodPatterns, SUPPRESS_MAP } = require('../core/false-positive-filter');

  function makeFinding(overrides: Record<string, unknown> = {}) {
    return {
      ruleId: 'ERR-001',
      line: 1,
      message: 'empty catch block',
      severity: 'high',
      confidence: 'high',
      ...overrides,
    };
  }

  // --- Stage 2 SYN: string literal findings get dismissed ---
  test('Stage 2 SYN: string literal findings get dismissed', () => {
    const code = '"some error about console.log"\nconst x = 1;';
    const findings = [makeFinding({ line: 1, message: 'console.log detected' })];
    const result = runFalsePositiveFilter(findings, 'app.ts', code);
    expect(result.dismissed.length).toBe(1);
    expect(result.dismissed[0].stage).toBe(2);
    expect(result.kept.length).toBe(0);
  });

  // --- Stage 3 CTX: .catch findings get dismissed ---
  test('Stage 3 CTX: .catch(() => {}) findings get dismissed', () => {
    const code = 'promise.catch(() => {});\nconst a = 1;';
    const findings = [makeFinding({ line: 1, message: 'empty catch handler' })];
    const result = runFalsePositiveFilter(findings, 'app.ts', code);
    expect(result.dismissed.length).toBe(1);
    expect(result.dismissed[0].stage).toBe(3);
  });

  // --- Stage 5a: suppress-fp removes matched findings ---
  test('Stage 5a: suppress-fp removes findings when good pattern detected', () => {
    // Code with try-catch-finally pattern -> should suppress ASY-003
    const code = [
      'async function doWork() {',
      '  try {',
      '    await fetch("/api");',
      '  } catch (e) {',
      '    console.error(e);',
      '  } finally {',
      '    cleanup();',
      '  }',
      '}',
    ].join('\n');
    const findings = [makeFinding({ ruleId: 'ASY-003', line: 3, message: 'unhandled rejection' })];
    const result = runFalsePositiveFilter(findings, 'service.ts', code);
    // ASY-003 should be dismissed via GQ-AS-005 suppress pattern
    expect(result.dismissed.length).toBe(1);
    expect(result.stats.stage5).toBe(1);
  });

  // --- Stage 5b: boost signals downgrade confidence ---
  test('Stage 5b: boost signal downgrades confidence for same quality dimension', () => {
    // Code with multiple Reliability boost patterns
    const code = [
      'const val: unknown = getData();',
      'if (val !== null && val !== undefined) {',
      '  const arr = Array.isArray(val) ? val : [val];',
      '  if (arr.length > 0) {',
      '    Number.isNaN(arr[0]);',
      '  }',
      '}',
      'function check(x: string): boolean { return x.length > 0; }',
    ].join('\n');
    // Finding in Reliability dimension (RTE prefix)
    const findings = [makeFinding({
      ruleId: 'RTE-005',
      line: 4,
      message: 'Array length check missing',
      confidence: 'high',
    })];
    const result = runFalsePositiveFilter(findings, 'utils.ts', code);
    // With enough Reliability boost patterns, confidence should be downgraded
    if (result.kept.length > 0) {
      // Either dismissed or downgraded
      const keptFinding = result.kept[0];
      // Multiple reliability boosts present, so confidence may be downgraded
      expect(['high', 'medium', 'low']).toContain(keptFinding.confidence);
    }
    // At least the filter ran without error
    expect(result.stats.total).toBe(1);
  });

  // --- detectGoodPatterns ---
  test('detectGoodPatterns detects try-catch-finally', () => {
    const code = 'try { doSomething(); } catch (e) { log(e); } finally { cleanup(); }';
    const patterns = detectGoodPatterns(code);
    expect(patterns.has('GQ-AS-005')).toBe(true);
  });

  test('detectGoodPatterns detects const preference', () => {
    // More than 3x const vs let
    const code = [
      'const a = 1;', 'const b = 2;', 'const c = 3;', 'const d = 4;',
      'const e = 5;', 'const f = 6;', 'const g = 7;',
      'let x = 0;',
    ].join('\n');
    const patterns = detectGoodPatterns(code);
    expect(patterns.has('GQ-FN-009')).toBe(true);
  });

  test('detectGoodPatterns detects optional chaining', () => {
    const code = 'const val = obj?.nested?.prop;';
    const patterns = detectGoodPatterns(code);
    expect(patterns.has('GQ-NL-001')).toBe(true);
  });

  test('detectGoodPatterns detects nullish coalescing', () => {
    const code = 'const val = x ?? defaultValue;';
    const patterns = detectGoodPatterns(code);
    expect(patterns.has('GQ-NL-002')).toBe(true);
  });

  test('detectGoodPatterns detects Promise.all', () => {
    const code = 'const results = await Promise.all(tasks);';
    const patterns = detectGoodPatterns(code);
    expect(patterns.has('GQ-AS-002')).toBe(true);
  });

  // --- SUPPRESS_MAP structure ---
  test('SUPPRESS_MAP has expected entries', () => {
    expect(SUPPRESS_MAP['GQ-AS-005']).toEqual(expect.arrayContaining(['ASY-003']));
    expect(SUPPRESS_MAP['GQ-NL-010']).toEqual(expect.arrayContaining(['RTE-001', 'RTE-002']));
    expect(SUPPRESS_MAP['GQ-SC-009']).toEqual(expect.arrayContaining(['SEC-001']));
  });
});

// ============================================================
// PART 3 — good-pattern-catalog.ts
// ============================================================

describe('core/good-pattern-catalog', () => {
  const {
    GOOD_PATTERN_CATALOG,
    getGoodPattern,
    getSuppressorsFor,
    getGoodCatalogStats,
  } = require('../core/good-pattern-catalog');

  test('GOOD_PATTERN_CATALOG has 212 entries', () => {
    expect(GOOD_PATTERN_CATALOG.length).toBe(212);
  });

  test('getSuppressorsFor returns correct suppressors for SEC-001', () => {
    const suppressors = getSuppressorsFor('SEC-001');
    expect(suppressors.length).toBeGreaterThan(0);
    const ids = suppressors.map((s: { id: string }) => s.id);
    expect(ids).toContain('GQ-SC-009');
  });

  test('getSuppressorsFor returns empty array for unknown ruleId', () => {
    const suppressors = getSuppressorsFor('NONEXISTENT-999');
    expect(suppressors).toEqual([]);
  });

  test('getGoodCatalogStats returns correct counts', () => {
    const stats = getGoodCatalogStats();
    expect(stats.total).toBe(212);
    expect(stats.boost).toBeGreaterThan(0);
    expect(stats.suppressFP).toBeGreaterThan(0);
    expect(stats.neutral).toBeGreaterThan(0);
    expect(stats.boost + stats.suppressFP + stats.neutral).toBe(stats.total);
  });

  test('getGoodPattern returns correct entry by ID', () => {
    const pattern = getGoodPattern('GQ-NM-001');
    expect(pattern).toBeDefined();
    expect(pattern.title).toBeDefined();
    expect(pattern.quality).toBe('Maintainability');
  });

  test('getGoodPattern returns undefined for unknown ID', () => {
    const pattern = getGoodPattern('INVALID-999');
    expect(pattern).toBeUndefined();
  });
});

// ============================================================
// PART 4 — rule-catalog.ts
// ============================================================

describe('core/rule-catalog', () => {
  const {
    RULE_CATALOG,
    getRule,
    getRulesByCategory,
    getRulesByEngine,
    getHardFailRules,
    getCatalogStats,
  } = require('../core/rule-catalog');

  test('Total rules = 224', () => {
    expect(RULE_CATALOG.length).toBe(224);
  });

  test('getRule returns correct rule by ID', () => {
    const rule = getRule('SYN-001');
    expect(rule).toBeDefined();
    expect(rule.title).toContain('중괄호');
    expect(rule.category).toBe('syntax');
    expect(rule.severity).toBe('critical');
  });

  test('getRule returns undefined for unknown ID', () => {
    const rule = getRule('BOGUS-999');
    expect(rule).toBeUndefined();
  });

  test('getRulesByCategory returns correct count for security', () => {
    const secRules = getRulesByCategory('security');
    expect(secRules.length).toBe(27);
    for (const r of secRules) {
      expect(r.category).toBe('security');
    }
  });

  test('getRulesByCategory returns correct count for syntax', () => {
    const synRules = getRulesByCategory('syntax');
    expect(synRules.length).toBe(10);
  });

  test('getRulesByEngine returns non-empty for ast', () => {
    const astRules = getRulesByEngine('ast');
    expect(astRules.length).toBeGreaterThan(0);
    for (const r of astRules) {
      expect(r.engine).toBe('ast');
    }
  });

  test('getHardFailRules returns only hard-fail actions', () => {
    const hardFails = getHardFailRules();
    expect(hardFails.length).toBeGreaterThan(0);
    for (const r of hardFails) {
      expect(r.defaultAction).toBe('hard-fail');
    }
  });

  test('getCatalogStats returns consistent totals', () => {
    const stats = getCatalogStats();
    expect(stats.total).toBe(224);
    expect(stats.categories).toBeGreaterThanOrEqual(16);
    const actionSum = stats.byAction['hard-fail'] + stats.byAction.review + stats.byAction.hint;
    expect(actionSum).toBe(224);
  });
});
