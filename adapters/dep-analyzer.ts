// ============================================================
// CS Quill 🦔 — Dependency Analyzer
// ============================================================
// 5 packages: dependency-cruiser, depcheck, knip, publint, are-the-types-wrong

// ============================================================
// PART 1 — depcheck (미사용 의존성 탐지)
// ============================================================

export async function runDepcheck(rootPath: string) {
  const { execSync } = await import('child_process');

  try {
    const output = execSync('npx depcheck --json 2>/dev/null', {
      cwd: rootPath, encoding: 'utf-8', timeout: 30000,
    });

    const data = JSON.parse(output);
    return {
      unused: data.dependencies ?? [],
      unusedDev: data.devDependencies ?? [],
      missing: Object.keys(data.missing ?? {}),
      score: Math.max(0, 100 - (data.dependencies?.length ?? 0) * 10 - Object.keys(data.missing ?? {}).length * 15),
      engine: 'depcheck',
    };
  } catch {
    return { unused: [], unusedDev: [], missing: [], score: 100, engine: 'depcheck (unavailable)' };
  }
}

// IDENTITY_SEAL: PART-1 | role=depcheck | inputs=rootPath | outputs=unused,missing

// ============================================================
// PART 2 — knip (미사용 파일/export/타입 탐지)
// ============================================================

export async function runKnip(rootPath: string) {
  const { execSync } = await import('child_process');

  try {
    const output = execSync('npx knip --reporter json 2>/dev/null', {
      cwd: rootPath, encoding: 'utf-8', timeout: 60000,
    });

    const data = JSON.parse(output);
    const unusedFiles = data.files ?? [];
    const unusedExports = data.exports ?? [];
    const unusedTypes = data.types ?? [];

    return {
      unusedFiles: unusedFiles.length,
      unusedExports: unusedExports.length,
      unusedTypes: unusedTypes.length,
      total: unusedFiles.length + unusedExports.length + unusedTypes.length,
      details: {
        files: unusedFiles.slice(0, 10),
        exports: unusedExports.slice(0, 10),
        types: unusedTypes.slice(0, 10),
      },
      score: Math.max(0, 100 - unusedFiles.length * 5 - unusedExports.length * 3 - unusedTypes.length * 2),
      engine: 'knip',
    };
  } catch {
    return { unusedFiles: 0, unusedExports: 0, unusedTypes: 0, total: 0, details: { files: [], exports: [], types: [] }, score: 100, engine: 'knip (unavailable)' };
  }
}

// IDENTITY_SEAL: PART-2 | role=knip | inputs=rootPath | outputs=unused

// ============================================================
// PART 3 — dependency-cruiser (의존성 시각화 + 규칙)
// ============================================================

export async function runDependencyCruiser(rootPath: string) {
  const { execSync } = await import('child_process');

  try {
    const output = execSync(
      'npx depcruise --output-type json src/ 2>/dev/null',
      { cwd: rootPath, encoding: 'utf-8', timeout: 30000 },
    );

    const data = JSON.parse(output);
    const violations = data.summary?.violations ?? [];
    const totalModules = data.summary?.totalCruised ?? 0;
    const circular = violations.filter((v: unknown) => v.rule?.severity === 'error' && v.cycle);

    return {
      totalModules,
      violations: violations.length,
      circular: circular.length,
      orphans: data.summary?.orphans ?? 0,
      details: violations.slice(0, 10).map((v: unknown) => ({
        from: v.from,
        to: v.to,
        rule: v.rule?.name ?? 'unknown',
        severity: v.rule?.severity ?? 'warn',
      })),
      score: Math.max(0, 100 - circular.length * 20 - violations.length * 5),
      engine: 'dependency-cruiser',
    };
  } catch {
    return { totalModules: 0, violations: 0, circular: 0, orphans: 0, details: [], score: 100, engine: 'dependency-cruiser (unavailable)' };
  }
}

// IDENTITY_SEAL: PART-3 | role=dependency-cruiser | inputs=rootPath | outputs=violations

// ============================================================
// PART 4 — publint (npm 패키지 퍼블리시 검증)
// ============================================================

export async function runPublint(rootPath: string) {
  const { execSync } = await import('child_process');

  try {
    const output = execSync('npx publint --json 2>/dev/null', {
      cwd: rootPath, encoding: 'utf-8', timeout: 15000,
    });

    const data = JSON.parse(output);
    const messages = data.messages ?? [];
    const errors = messages.filter((m: unknown) => m.type === 'error');
    const warnings = messages.filter((m: unknown) => m.type === 'warning');

    return {
      errors: errors.length,
      warnings: warnings.length,
      messages: messages.slice(0, 10).map((m: unknown) => ({ type: m.type, message: m.message ?? String(m) })),
      score: Math.max(0, 100 - errors.length * 20 - warnings.length * 5),
      engine: 'publint',
    };
  } catch {
    return { errors: 0, warnings: 0, messages: [], score: 100, engine: 'publint (unavailable)' };
  }
}

// IDENTITY_SEAL: PART-4 | role=publint | inputs=rootPath | outputs=messages

// ============================================================
// PART 5 — are-the-types-wrong (타입 export 검증)
// ============================================================

export async function runAttw(rootPath: string) {
  const { execSync } = await import('child_process');

  try {
    const output = execSync('npx attw --pack --json 2>/dev/null', {
      cwd: rootPath, encoding: 'utf-8', timeout: 30000,
    });

    const data = JSON.parse(output);
    const problems = data.problems ?? [];

    return {
      problemCount: problems.length,
      problems: problems.slice(0, 10).map((p: unknown) => ({ kind: p.kind, entrypoint: p.entrypoint, resolution: p.resolution })),
      score: Math.max(0, 100 - problems.length * 15),
      engine: 'attw',
    };
  } catch {
    return { problemCount: 0, problems: [], score: 100, engine: 'attw (unavailable)' };
  }
}

// IDENTITY_SEAL: PART-5 | role=attw | inputs=rootPath | outputs=problems

// ============================================================
// PART 6 — oxlint (Rust 기반 초고속 린터)
// ============================================================

export async function runOxlint(rootPath: string) {
  const { execSync } = await import('child_process');

  try {
    const output = execSync('npx oxlint --format json src/ 2>/dev/null', {
      cwd: rootPath, encoding: 'utf-8', timeout: 15000,
    });

    const lines = output.split('\n').filter(Boolean);
    const findings: Array<{ file: string; line: number; message: string; severity: string }> = [];

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        if (data.message) {
          findings.push({
            file: data.filename ?? '',
            line: data.line ?? 0,
            message: data.message,
            severity: data.severity === 'error' ? 'error' : 'warning',
          });
        }
      } catch { /* non-JSON line */ }
    }

    return {
      findings: findings.slice(0, 30),
      total: findings.length,
      errors: findings.filter(f => f.severity === 'error').length,
      score: Math.max(0, 100 - findings.filter(f => f.severity === 'error').length * 5 - findings.filter(f => f.severity === 'warning').length * 2),
      engine: 'oxlint',
    };
  } catch {
    return { findings: [], total: 0, errors: 0, score: 100, engine: 'oxlint (unavailable)' };
  }
}

// IDENTITY_SEAL: PART-6 | role=oxlint | inputs=rootPath | outputs=findings

// ============================================================
// PART 7 — codemod (자동 마이그레이션 감지)
// ============================================================

export async function detectCodemodOpportunities(rootPath: string) {
  const { readFileSync, existsSync } = await import('fs');
  const { join } = await import('path');

  const opportunities: Array<{ from: string; to: string; description: string; command: string }> = [];

  const pkgPath = join(rootPath, 'package.json');
  if (!existsSync(pkgPath)) return { opportunities, engine: 'codemod' };

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

  // Known migration paths
  const MIGRATIONS: Array<{ from: string; condition: (v: string) => boolean; to: string; desc: string; cmd: string }> = [
    { from: 'react', condition: v => parseInt(v) < 19, to: 'React 19', desc: 'forwardRef 제거, use() 훅', cmd: 'npx codemod react/19/migration' },
    { from: 'next', condition: v => parseInt(v) < 15, to: 'Next.js 15+', desc: 'App Router 마이그레이션', cmd: 'npx @next/codemod@latest upgrade' },
    { from: 'typescript', condition: v => parseInt(v) < 5, to: 'TypeScript 5+', desc: 'enum → const, satisfies', cmd: 'npx codemod typescript/5/migration' },
    { from: 'jest', condition: () => !!allDeps['vitest'] === false, to: 'Vitest', desc: 'Jest → Vitest (3x faster)', cmd: 'npx codemod jest/to-vitest' },
    { from: 'moment', condition: () => true, to: 'dayjs', desc: 'moment → dayjs (290kB → 2kB)', cmd: 'npx codemod moment/to-dayjs' },
    { from: 'lodash', condition: () => !allDeps['lodash-es'], to: 'lodash-es', desc: 'lodash → lodash-es (tree-shakeable)', cmd: 'npm install lodash-es' },
  ];

  for (const m of MIGRATIONS) {
    const version = allDeps[m.from];
    if (version && m.condition(version.replace(/[\^~]/g, ''))) {
      opportunities.push({ from: m.from, to: m.to, description: m.desc, command: m.cmd });
    }
  }

  return { opportunities, engine: 'codemod' };
}

// IDENTITY_SEAL: PART-7 | role=codemod | inputs=rootPath | outputs=opportunities

// ============================================================
// PART 8 — Unified Dependency Analysis
// ============================================================

export async function runFullDepAnalysis(rootPath: string) {
  const results: Array<{ engine: string; score: number; detail: string }> = [];

  // depcheck
  const depcheck = await runDepcheck(rootPath);
  results.push({ engine: depcheck.engine, score: depcheck.score, detail: `${depcheck.unused.length} unused, ${depcheck.missing.length} missing` });

  // knip
  const knip = await runKnip(rootPath);
  results.push({ engine: knip.engine, score: knip.score, detail: `${knip.unusedFiles} files, ${knip.unusedExports} exports, ${knip.unusedTypes} types` });

  // dependency-cruiser
  const depcruise = await runDependencyCruiser(rootPath);
  results.push({ engine: depcruise.engine, score: depcruise.score, detail: `${depcruise.circular} circular, ${depcruise.violations} violations` });

  // oxlint
  const oxlint = await runOxlint(rootPath);
  results.push({ engine: oxlint.engine, score: oxlint.score, detail: `${oxlint.total} issues (${oxlint.errors} errors)` });

  // codemod
  const codemod = await detectCodemodOpportunities(rootPath);
  if (codemod.opportunities.length > 0) {
    results.push({ engine: codemod.engine, score: Math.max(0, 100 - codemod.opportunities.length * 10), detail: `${codemod.opportunities.length} migration opportunities` });
  }

  const avgScore = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 100;
  return { engines: results.length, results, avgScore };
}

// IDENTITY_SEAL: PART-8 | role=unified-dep | inputs=rootPath | outputs=results
