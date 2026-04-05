// ============================================================
// CS Quill 🦔 — Lint Engine Adapter
// ============================================================
// 6 packages: eslint, @typescript-eslint, biome, prettier, jscpd, madge

// ============================================================
// PART 1 — ESLint + TypeScript-ESLint
// ============================================================

export async function runESLint(filePath: string) {
  const { ESLint } = await import('eslint');
  const eslint = new ESLint({ fix: false, overrideConfigFile: undefined });

  const results = await eslint.lintFiles([filePath]);
  const findings = results.flatMap(r =>
    r.messages.map(m => ({
      file: r.filePath,
      line: m.line,
      message: m.message,
      severity: m.severity === 2 ? 'error' as const : 'warning' as const,
      rule: m.ruleId ?? 'unknown',
    })),
  );

  return { findings, errorCount: results.reduce((s, r) => s + r.errorCount, 0) };
}

// IDENTITY_SEAL: PART-1 | role=eslint | inputs=filePath | outputs=findings

// ============================================================
// PART 2 — Prettier (포맷 검증)
// ============================================================

export async function checkPrettier(code: string, filePath: string = 'temp.ts') {
  const prettier = await import('prettier');
  const options = await prettier.resolveConfig(filePath) ?? {};

  const formatted = await prettier.format(code, { ...options, filepath: filePath });
  const isFormatted = formatted === code;

  return {
    isFormatted,
    diff: isFormatted ? null : { original: code.length, formatted: formatted.length },
  };
}

// IDENTITY_SEAL: PART-2 | role=prettier | inputs=code | outputs={isFormatted}

// ============================================================
// PART 3 — JSCPD (중복 코드 탐지)
// ============================================================

export async function runJSCPD(rootPath: string) {
  const { detectClones } = await import('jscpd');

  const clones = await detectClones({
    path: [rootPath],
    pattern: '**/*.{ts,tsx,js,jsx}',
    ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**'],
    minLines: 5,
    minTokens: 50,
    output: undefined,
    silent: true,
  });

  return {
    duplicateCount: clones.length,
    findings: clones.map((c: unknown) => ({
      fileA: c.duplicationA?.sourceId ?? 'unknown',
      fileB: c.duplicationB?.sourceId ?? 'unknown',
      lines: c.lines ?? 0,
      tokens: c.tokens ?? 0,
    })),
  };
}

// IDENTITY_SEAL: PART-3 | role=jscpd | inputs=rootPath | outputs=duplicates

// ============================================================
// PART 4 — Madge (순환 의존성)
// ============================================================

export async function runMadge(rootPath: string) {
  const madge = (await import('madge')).default;

  const result = await madge(rootPath, {
    fileExtensions: ['ts', 'tsx', 'js', 'jsx'],
    excludeRegExp: [/node_modules/, /\.next/, /dist/],
    tsConfig: undefined,
  });

  const circular = result.circular();
  const orphans = result.orphans();

  return {
    circularCount: circular.length,
    circular: circular.slice(0, 20),
    orphanCount: orphans.length,
    orphans: orphans.slice(0, 20),
    totalModules: Object.keys(result.obj()).length,
  };
}

// IDENTITY_SEAL: PART-4 | role=madge | inputs=rootPath | outputs=circular,orphans

// ============================================================
// PART 5 — Unified Lint Runner
// ============================================================

export async function runFullLintAnalysis(rootPath: string, sampleFile?: string) {
  const results: Array<{ engine: string; score: number; detail: string }> = [];

  // ESLint
  if (sampleFile) {
    try {
      const eslintResult = await runESLint(sampleFile);
      const score = Math.max(0, 100 - eslintResult.errorCount * 5);
      results.push({ engine: 'eslint', score, detail: `${eslintResult.findings.length} issues` });
    } catch { results.push({ engine: 'eslint', score: 50, detail: 'not configured' }); }
  }

  // Prettier
  if (sampleFile) {
    try {
      const { readFileSync } = await import('fs');
      const code = readFileSync(sampleFile, 'utf-8');
      const prettierResult = await checkPrettier(code, sampleFile);
      results.push({ engine: 'prettier', score: prettierResult.isFormatted ? 100 : 70, detail: prettierResult.isFormatted ? 'formatted' : 'needs formatting' });
    } catch { results.push({ engine: 'prettier', score: 50, detail: 'not configured' }); }
  }

  // JSCPD
  try {
    const jscpdResult = await runJSCPD(rootPath);
    const score = Math.max(0, 100 - jscpdResult.duplicateCount * 10);
    results.push({ engine: 'jscpd', score, detail: `${jscpdResult.duplicateCount} duplicates` });
  } catch { results.push({ engine: 'jscpd', score: 50, detail: 'error' }); }

  // Madge
  try {
    const madgeResult = await runMadge(rootPath);
    const score = madgeResult.circularCount === 0 ? 100 : Math.max(0, 100 - madgeResult.circularCount * 20);
    results.push({ engine: 'madge', score, detail: `${madgeResult.circularCount} circular, ${madgeResult.orphanCount} orphans` });
  } catch { results.push({ engine: 'madge', score: 50, detail: 'error' }); }

  const avgScore = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;
  return { engines: results.length, results, avgScore };
}

// IDENTITY_SEAL: PART-5 | role=unified-lint | inputs=rootPath | outputs=results
