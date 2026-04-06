// @ts-nocheck — external library wrapper, types handled at runtime
// ============================================================
// CS Quill 🦔 — Dependency Analyzer
// ============================================================
// 5 packages: dependency-cruiser, depcheck, knip, publint, are-the-types-wrong

// ============================================================
// PART 1 — depcheck (미사용 의존성 탐지)
// ============================================================

export async function runDepcheck(rootPath: string) {
  const { execSync } = require('child_process');

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
  const { execSync } = require('child_process');

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
  const { execSync } = require('child_process');

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
  const { execSync } = require('child_process');

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
  const { execSync } = require('child_process');

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
  const { execSync } = require('child_process');

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
  const { readFileSync, existsSync } = require('fs');
  const { join } = require('path');

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
// PART 8 — Circular Dependency Detection (자체 import 그래프)
// ============================================================

export async function detectCircularDeps(rootPath: string) {
  const fs = require('fs');
  const path = require('path');

  const graph = new Map<string, string[]>();
  const cycles: string[][] = [];

  function collectFiles(dir: string, exts: string[]): string[] {
    const results: string[] = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist') {
          results.push(...collectFiles(full, exts));
        } else if (entry.isFile() && exts.some((e: string) => entry.name.endsWith(e))) {
          results.push(full);
        }
      }
    } catch { /* skip */ }
    return results;
  }

  const files = collectFiles(rootPath, ['.ts', '.tsx', '.js', '.jsx', '.mjs']);

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const rel = path.relative(rootPath, file);
      const deps: string[] = [];

      // Match import/require patterns
      const importRe = /(?:import\s+.*?from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\))/g;
      let m;
      while ((m = importRe.exec(content)) !== null) {
        const mod = m[1] ?? m[2];
        if (mod.startsWith('.')) {
          const resolved = path.relative(rootPath, path.resolve(path.dirname(file), mod)).replace(/\\/g, '/');
          deps.push(resolved);
        }
      }
      graph.set(rel.replace(/\\/g, '/'), deps);
    } catch { /* skip */ }
  }

  // DFS cycle detection
  const visited = new Set<string>();
  const stack = new Set<string>();

  function dfs(node: string, pathSoFar: string[]): void {
    if (stack.has(node)) {
      const cycleStart = pathSoFar.indexOf(node);
      if (cycleStart >= 0) {
        cycles.push(pathSoFar.slice(cycleStart).concat(node));
      }
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    stack.add(node);
    pathSoFar.push(node);

    for (const dep of graph.get(node) ?? []) {
      // Resolve extension-less imports
      const candidates = [dep, dep + '.ts', dep + '.tsx', dep + '.js', dep + '/index.ts', dep + '/index.js'];
      for (const c of candidates) {
        if (graph.has(c)) {
          dfs(c, [...pathSoFar]);
          break;
        }
      }
    }

    stack.delete(node);
  }

  for (const node of graph.keys()) {
    dfs(node, []);
  }

  // Deduplicate cycles (same set of nodes)
  const seen = new Set<string>();
  const uniqueCycles = cycles.filter(c => {
    const key = [...c].sort().join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    totalModules: graph.size,
    cycles: uniqueCycles.slice(0, 20),
    cycleCount: uniqueCycles.length,
    score: Math.max(0, 100 - uniqueCycles.length * 15),
    engine: 'circular-dep-detect',
  };
}

// IDENTITY_SEAL: PART-8 | role=circular-dep | inputs=rootPath | outputs=cycles

// ============================================================
// PART 9 — Version Mismatch Detection (package.json vs lockfile)
// ============================================================

export async function detectVersionMismatches(rootPath: string) {
  const fs = require('fs');
  const path = require('path');

  const mismatches: Array<{ pkg: string; declared: string; locked: string; severity: string }> = [];
  const warnings: string[] = [];

  const pkgPath = path.join(rootPath, 'package.json');
  if (!fs.existsSync(pkgPath)) return { mismatches, warnings, score: 100, engine: 'version-mismatch' };

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const allDeclared = { ...pkg.dependencies, ...pkg.devDependencies };

  // Try package-lock.json
  const lockPath = path.join(rootPath, 'package-lock.json');
  if (fs.existsSync(lockPath)) {
    try {
      const lock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
      const lockPackages = lock.packages ?? {};
      const lockDeps = lock.dependencies ?? {};

      for (const [name, declaredVersion] of Object.entries(allDeclared)) {
        const dv = declaredVersion as string;
        // Check in lockfile v3 (packages) or v1 (dependencies)
        const lockEntry = lockPackages[`node_modules/${name}`] ?? lockDeps[name];
        if (!lockEntry) {
          warnings.push(`${name}: declared in package.json but missing from lockfile`);
          continue;
        }

        const lockedVersion = lockEntry.version as string;
        if (!lockedVersion) continue;

        // Strip semver prefix for comparison
        const clean = dv.replace(/^[\^~>=<]*/g, '');
        const major = clean.split('.')[0];
        const lockedMajor = lockedVersion.split('.')[0];

        if (major && lockedMajor && major !== lockedMajor) {
          mismatches.push({
            pkg: name,
            declared: dv,
            locked: lockedVersion,
            severity: 'error',
          });
        }
      }
    } catch { /* corrupt lockfile */ }
  }

  // Detect duplicate major versions in dependency tree
  if (fs.existsSync(lockPath)) {
    try {
      const lock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
      const packages = lock.packages ?? {};
      const versionMap = new Map<string, string[]>();

      for (const [key, entry] of Object.entries(packages)) {
        if (!key.includes('node_modules/')) continue;
        const name = key.split('node_modules/').pop()!;
        const ver = (entry as any).version;
        if (!ver || name.startsWith('.')) continue;
        const existing = versionMap.get(name) ?? [];
        if (!existing.includes(ver)) existing.push(ver);
        versionMap.set(name, existing);
      }

      for (const [name, versions] of versionMap) {
        if (versions.length > 1) {
          const majors = new Set(versions.map(v => v.split('.')[0]));
          if (majors.size > 1) {
            warnings.push(`${name}: multiple major versions in tree: ${versions.join(', ')}`);
          }
        }
      }
    } catch { /* skip */ }
  }

  const score = Math.max(0, 100 - mismatches.length * 20 - warnings.length * 5);
  return { mismatches, warnings: warnings.slice(0, 20), score, engine: 'version-mismatch' };
}

// IDENTITY_SEAL: PART-9 | role=version-mismatch | inputs=rootPath | outputs=mismatches

// ============================================================
// PART 10 — Unused Dependency Detection (소스 스캔 기반)
// ============================================================

export async function detectUnusedDepsLocal(rootPath: string) {
  const fs = require('fs');
  const path = require('path');

  const pkgPath = path.join(rootPath, 'package.json');
  if (!fs.existsSync(pkgPath)) return { unused: [], phantomDeps: [], score: 100, engine: 'unused-dep-local' };

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const prodDeps = Object.keys(pkg.dependencies ?? {});
  const devDeps = Object.keys(pkg.devDependencies ?? {});

  // Collect all source content to search for imports
  function collectSource(dir: string): string {
    let content = '';
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
          content += collectSource(full);
        } else if (entry.isFile() && /\.(ts|tsx|js|jsx|mjs|cjs|json|vue|svelte)$/.test(entry.name)) {
          try { content += fs.readFileSync(full, 'utf-8') + '\n'; } catch { /* skip */ }
        }
      }
    } catch { /* skip */ }
    return content;
  }

  const allSource = collectSource(rootPath);

  // Config files that reference packages implicitly
  const configFiles = ['tsconfig.json', 'jest.config.js', 'jest.config.ts', 'vite.config.ts',
    'vitest.config.ts', 'webpack.config.js', 'rollup.config.js', '.eslintrc.js', '.eslintrc.json',
    'tailwind.config.js', 'tailwind.config.ts', 'postcss.config.js', 'next.config.js', 'next.config.mjs'];

  let configContent = '';
  for (const cf of configFiles) {
    const cfPath = path.join(rootPath, cf);
    if (fs.existsSync(cfPath)) {
      try { configContent += fs.readFileSync(cfPath, 'utf-8') + '\n'; } catch { /* skip */ }
    }
  }

  const combinedSource = allSource + configContent;

  // Known implicit dependencies (used by tools, not imported)
  const implicitDeps = new Set([
    'typescript', '@types/node', '@types/react', '@types/jest', 'prettier',
    'eslint', 'husky', 'lint-staged', 'concurrently', 'cross-env',
  ]);

  const unused: Array<{ name: string; type: 'prod' | 'dev' }> = [];
  const phantomDeps: string[] = [];

  for (const dep of prodDeps) {
    if (implicitDeps.has(dep)) continue;
    // Check if referenced anywhere: import, require, or package name in configs
    const escapedDep = dep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`['"]${escapedDep}['"/]|from\\s+['"]${escapedDep}|require\\(['"]${escapedDep}`);
    if (!re.test(combinedSource)) {
      unused.push({ name: dep, type: 'prod' });
    }
  }

  for (const dep of devDeps) {
    if (implicitDeps.has(dep)) continue;
    if (dep.startsWith('@types/')) continue; // type packages are implicit
    const escapedDep = dep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`['"]${escapedDep}['"/]|from\\s+['"]${escapedDep}|require\\(['"]${escapedDep}`);
    if (!re.test(combinedSource)) {
      unused.push({ name: dep, type: 'dev' });
    }
  }

  // Phantom deps: imported but not in package.json
  const importedPkgs = new Set<string>();
  const importRe = /(?:from\s+['"]|require\s*\(\s*['"])([^./'"@][^'"]*|@[^/'"]+\/[^'"]+)/g;
  let m;
  while ((m = importRe.exec(allSource)) !== null) {
    const pkgName = m[1].includes('/') && m[1].startsWith('@')
      ? m[1].split('/').slice(0, 2).join('/')
      : m[1].split('/')[0];
    importedPkgs.add(pkgName);
  }

  const allDeclared = new Set([...prodDeps, ...devDeps]);
  for (const imported of importedPkgs) {
    if (!allDeclared.has(imported) && !imported.startsWith('node:') && !['fs', 'path', 'os', 'url', 'crypto', 'http', 'https', 'child_process', 'stream', 'util', 'events', 'buffer', 'net', 'tls', 'zlib', 'assert', 'querystring', 'readline'].includes(imported)) {
      phantomDeps.push(imported);
    }
  }

  const score = Math.max(0, 100 - unused.filter(u => u.type === 'prod').length * 10 - unused.filter(u => u.type === 'dev').length * 3 - phantomDeps.length * 15);
  return { unused: unused.slice(0, 30), phantomDeps: phantomDeps.slice(0, 20), score, engine: 'unused-dep-local' };
}

// IDENTITY_SEAL: PART-10 | role=unused-dep-local | inputs=rootPath | outputs=unused,phantomDeps

// ============================================================
// PART 11 — Unified Dependency Analysis
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

  // circular dependency detection (self-scan)
  const circular = await detectCircularDeps(rootPath);
  results.push({ engine: circular.engine, score: circular.score, detail: `${circular.cycleCount} circular dependency chains across ${circular.totalModules} modules` });

  // version mismatch detection
  const versionMismatch = await detectVersionMismatches(rootPath);
  results.push({ engine: versionMismatch.engine, score: versionMismatch.score, detail: `${versionMismatch.mismatches.length} mismatches, ${versionMismatch.warnings.length} warnings` });

  // unused dependency detection (local source scan)
  const unusedLocal = await detectUnusedDepsLocal(rootPath);
  results.push({ engine: unusedLocal.engine, score: unusedLocal.score, detail: `${unusedLocal.unused.length} unused, ${unusedLocal.phantomDeps.length} phantom deps` });

  // codemod
  const codemod = await detectCodemodOpportunities(rootPath);
  if (codemod.opportunities.length > 0) {
    results.push({ engine: codemod.engine, score: Math.max(0, 100 - codemod.opportunities.length * 10), detail: `${codemod.opportunities.length} migration opportunities` });
  }

  const avgScore = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 100;
  return { engines: results.length, results, avgScore };
}

// IDENTITY_SEAL: PART-11 | role=unified-dep | inputs=rootPath | outputs=results
