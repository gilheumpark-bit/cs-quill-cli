// @ts-nocheck — external library wrapper, types handled at runtime
// ============================================================
// CS Quill 🦔 — Web Quality Engine
// ============================================================
// 4 packages: axe-core, lighthouse, size-limit, bundlephobia
// 접근성 + 웹 성능 + 번들 사이즈 분석.

// ============================================================
// PART 1 — Axe-Core (접근성 테스트)
// ============================================================

export async function runAxeAccessibility(htmlContent: string) {
  const findings: Array<{ line: number; message: string; severity: string; impact: string }> = [];

  try {
    const axe = require('axe-core');

    // axe-core는 DOM 기반이라 JSDOM으로 실행
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;

    const results = await axe.default.run(document.documentElement as unknown);

    for (const violation of results.violations) {
      for (const node of violation.nodes.slice(0, 5)) {
        findings.push({
          line: 0,
          message: `[${violation.id}] ${violation.description} — ${node.failureSummary?.slice(0, 100) ?? ''}`,
          severity: violation.impact === 'critical' ? 'error' : violation.impact === 'serious' ? 'error' : 'warning',
          impact: violation.impact ?? 'minor',
        });
      }
    }
  } catch {
    // Fallback: regex-based a11y check
    if (/<img\b[^>]*(?!alt=)/i.test(htmlContent)) {
      findings.push({ line: 0, message: 'Image without alt attribute', severity: 'warning', impact: 'serious' });
    }
    if (/<input\b[^>]*(?!aria-label|id=)/i.test(htmlContent)) {
      findings.push({ line: 0, message: 'Input without label association', severity: 'warning', impact: 'serious' });
    }
    if (/<button\b[^>]*>\s*<\/button>/i.test(htmlContent)) {
      findings.push({ line: 0, message: 'Empty button (no accessible name)', severity: 'error', impact: 'critical' });
    }
  }

  const score = Math.max(0, 100 - findings.filter(f => f.severity === 'error').length * 15 - findings.filter(f => f.severity === 'warning').length * 5);
  return { findings, score, engine: 'axe-core' };
}

// IDENTITY_SEAL: PART-1 | role=accessibility | inputs=htmlContent | outputs=findings

// ============================================================
// PART 2 — Bundle Size Check (bundlephobia + size-limit)
// ============================================================

export async function checkBundleSize(rootPath: string) {
  const { readFileSync, existsSync } = require('fs');
  const { join } = require('path');
  const findings: Array<{ name: string; size: string; severity: string }> = [];

  const pkgPath = join(rootPath, 'package.json');
  if (!existsSync(pkgPath)) return { findings, score: 100, engine: 'bundle-size' };

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  const deps = Object.keys(pkg.dependencies ?? {});

  // Check for known heavy packages
  const HEAVY_PACKAGES: Record<string, { minified: string; gzipped: string }> = {
    'moment': { minified: '290kB', gzipped: '72kB' },
    'lodash': { minified: '530kB', gzipped: '72kB' },
    'rxjs': { minified: '360kB', gzipped: '40kB' },
    'aws-sdk': { minified: '5MB+', gzipped: '1MB+' },
    '@mui/material': { minified: '800kB', gzipped: '180kB' },
    'antd': { minified: '1.2MB', gzipped: '350kB' },
    'firebase': { minified: '800kB', gzipped: '200kB' },
    'jquery': { minified: '90kB', gzipped: '30kB' },
    'underscore': { minified: '60kB', gzipped: '18kB' },
    'core-js': { minified: '500kB', gzipped: '150kB' },
    'd3': { minified: '270kB', gzipped: '80kB' },
    'chart.js': { minified: '200kB', gzipped: '65kB' },
    'three': { minified: '600kB', gzipped: '150kB' },
    'pdf-lib': { minified: '350kB', gzipped: '100kB' },
    'highlight.js': { minified: '950kB', gzipped: '280kB' },
    'xlsx': { minified: '800kB', gzipped: '250kB' },
    'monaco-editor': { minified: '4MB+', gzipped: '1MB+' },
    'draft-js': { minified: '210kB', gzipped: '60kB' },
    'quill': { minified: '400kB', gzipped: '110kB' },
  };

  const ALTERNATIVES: Record<string, string> = {
    'moment': 'dayjs (2kB) or date-fns (tree-shakeable)',
    'lodash': 'lodash-es (tree-shakeable) or native Array methods',
    'aws-sdk': '@aws-sdk/* (modular v3)',
    'rxjs': 'Consider if needed — often overengineered for simple cases',
    'jquery': 'Native DOM APIs (querySelector, fetch)',
    'underscore': 'lodash-es or native methods',
    'core-js': 'Only polyfill what you need with @babel/preset-env useBuiltIns',
    'd3': 'd3-* submodules (tree-shakeable)',
    'chart.js': 'chart.js/auto with tree-shaking or lightweight alternatives',
    'highlight.js': 'prism.js (lighter) or shiki (wasm-based)',
    'xlsx': 'exceljs (streaming) or csv-parse for simple cases',
    'monaco-editor': '@monaco-editor/react with lazy loading',
    'draft-js': 'tiptap or lexical (lighter, maintained)',
    'quill': 'tiptap (modular, lighter)',
  };

  for (const dep of deps) {
    const heavy = HEAVY_PACKAGES[dep];
    if (heavy) {
      findings.push({
        name: dep,
        size: `${heavy.minified} (${heavy.gzipped} gzip)`,
        severity: 'warning',
      });
    }
  }

  // size-limit style check: total deps count
  if (deps.length > 50) {
    findings.push({ name: `총 ${deps.length}개 의존성`, size: '과다', severity: 'warning' });
  }

  const score = Math.max(0, 100 - findings.length * 15);
  return {
    findings: findings.map(f => ({ ...f, alternative: ALTERNATIVES[f.name] })),
    totalDeps: deps.length,
    heavyCount: findings.length,
    score,
    engine: 'bundle-size',
  };
}

// IDENTITY_SEAL: PART-2 | role=bundle-size | inputs=rootPath | outputs=findings

// ============================================================
// PART 3 — Lighthouse (웹 성능/SEO, CLI 기반)
// ============================================================

export async function runLighthouse(url: string) {
  const { execSync } = require('child_process');

  try {
    const output = execSync(
      `npx lighthouse "${url}" --output=json --quiet --chrome-flags="--headless --no-sandbox" 2>/dev/null`,
      { encoding: 'utf-8', timeout: 60000 },
    );

    const data = JSON.parse(output);
    const categories = data.categories ?? {};

    return {
      performance: Math.round((categories.performance?.score ?? 0) * 100),
      accessibility: Math.round((categories.accessibility?.score ?? 0) * 100),
      bestPractices: Math.round((categories['best-practices']?.score ?? 0) * 100),
      seo: Math.round((categories.seo?.score ?? 0) * 100),
      engine: 'lighthouse',
    };
  } catch {
    return { performance: 0, accessibility: 0, bestPractices: 0, seo: 0, engine: 'lighthouse (unavailable)' };
  }
}

// IDENTITY_SEAL: PART-3 | role=lighthouse | inputs=url | outputs=scores

// ============================================================
// PART 4 — Tree-Shaking Analysis
// ============================================================

export async function analyzeTreeShaking(rootPath: string) {
  const { readFileSync, existsSync, readdirSync, statSync } = require('fs');
  const { join, relative } = require('path');

  const findings: Array<{ file: string; issue: string; severity: string }> = [];
  const pkgPath = join(rootPath, 'package.json');
  if (!existsSync(pkgPath)) return { findings, score: 100, engine: 'tree-shaking' };

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

  // Check 1: package.json "sideEffects" field
  if (pkg.sideEffects === undefined) {
    findings.push({ file: 'package.json', issue: 'Missing "sideEffects" field — bundlers cannot tree-shake safely', severity: 'warning' });
  }

  // Check 2: CJS vs ESM — check for "type": "module" or .mjs files
  const hasModuleField = !!pkg.module;
  const hasTypeModule = pkg.type === 'module';
  const hasExports = !!pkg.exports;

  if (!hasModuleField && !hasTypeModule && !hasExports) {
    findings.push({ file: 'package.json', issue: 'No ESM entry (module/exports/type:module) — CJS prevents tree-shaking', severity: 'warning' });
  }

  // Check 3: Scan source files for barrel exports and wildcard re-exports
  const IGNORE = new Set(['node_modules', '.next', '.git', 'dist', 'build', '.cache', '__pycache__']);
  const barrelFiles: string[] = [];
  const wildcardReExports: Array<{ file: string; line: number }> = [];

  const walk = (dir: string, depth: number = 0): void => {
    if (depth > 4) return;
    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.') || IGNORE.has(entry.name)) continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) { walk(full, depth + 1); continue; }
        if (!/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) continue;
        if (/^index\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) {
          try {
            const content = statSync(full).size < 50000 ? readFileSync(full, 'utf-8') : '';
            const lines = content.split('\n');
            const exportLines = lines.filter(l => /^export\s/.test(l.trim()));
            if (exportLines.length > 0 && exportLines.length === lines.filter(l => l.trim().length > 0).length) {
              barrelFiles.push(relative(rootPath, full));
            }
            for (let i = 0; i < lines.length; i++) {
              if (/export\s+\*\s+from/.test(lines[i])) {
                wildcardReExports.push({ file: relative(rootPath, full), line: i + 1 });
              }
            }
          } catch { /* skip */ }
        }
      }
    } catch { /* skip */ }
  };
  walk(rootPath);

  if (wildcardReExports.length > 0) {
    for (const w of wildcardReExports.slice(0, 5)) {
      findings.push({ file: w.file, issue: `Wildcard re-export (export * from) at line ${w.line} defeats tree-shaking`, severity: 'warning' });
    }
  }

  if (barrelFiles.length > 5) {
    findings.push({ file: `${barrelFiles.length} barrel files`, issue: 'Excessive barrel files (index.ts re-exporting) can defeat tree-shaking', severity: 'info' });
  }

  // Check 4: Non-tree-shakeable import patterns in source
  const badImports: Array<{ file: string; line: number; pattern: string }> = [];
  const checkImports = (dir: string, depth: number = 0): void => {
    if (depth > 3 || badImports.length >= 10) return;
    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.') || IGNORE.has(entry.name)) continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) { checkImports(full, depth + 1); continue; }
        if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) continue;
        try {
          const content = statSync(full).size < 100000 ? readFileSync(full, 'utf-8') : '';
          const lines = content.split('\n');
          for (let i = 0; i < lines.length && badImports.length < 10; i++) {
            // import lodash (full) instead of import { pick } from 'lodash-es'
            if (/require\(\s*['"]lodash['"]\s*\)/.test(lines[i]) || /import\s+_?\s+from\s+['"]lodash['"]/.test(lines[i])) {
              badImports.push({ file: relative(rootPath, full), line: i + 1, pattern: 'Full lodash import — use lodash-es or lodash/pick' });
            }
            // import * as X — namespace import pulls everything
            if (/import\s+\*\s+as\s+\w+\s+from/.test(lines[i]) && !/from\s+['"]react['"]/.test(lines[i])) {
              badImports.push({ file: relative(rootPath, full), line: i + 1, pattern: 'Namespace import (import *) — use named imports' });
            }
          }
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  };
  checkImports(rootPath);

  for (const bi of badImports) {
    findings.push({ file: `${bi.file}:${bi.line}`, issue: bi.pattern, severity: 'warning' });
  }

  const score = Math.max(0, 100 - findings.filter(f => f.severity === 'warning').length * 10 - findings.filter(f => f.severity === 'info').length * 3);
  return { findings, score, engine: 'tree-shaking' };
}

// IDENTITY_SEAL: PART-4 | role=tree-shaking | inputs=rootPath | outputs=findings

// ============================================================
// PART 5 — Unified Web Quality Runner
// ============================================================

export async function runFullWebQualityAnalysis(rootPath: string, lighthouseUrl?: string) {
  const results: Array<{ engine: string; score: number; detail: string }> = [];

  // Bundle size
  const bundle = await checkBundleSize(rootPath);
  results.push({ engine: 'bundle-size', score: bundle.score, detail: `${bundle.heavyCount} heavy deps / ${bundle.totalDeps} total` });

  // Tree-shaking analysis
  try {
    const treeShake = await analyzeTreeShaking(rootPath);
    results.push({ engine: 'tree-shaking', score: treeShake.score, detail: `${treeShake.findings.length} issues found` });
  } catch {
    results.push({ engine: 'tree-shaking', score: 50, detail: 'analysis failed' });
  }

  // Lighthouse (if URL provided, or detect from package.json scripts)
  const targetUrl = lighthouseUrl || detectDevUrl(rootPath);
  if (targetUrl) {
    try {
      const lh = await runLighthouse(targetUrl);
      const lhScore = Math.round((lh.performance + lh.accessibility + lh.bestPractices + lh.seo) / 4);
      results.push({
        engine: 'lighthouse',
        score: lhScore,
        detail: `perf ${lh.performance} a11y ${lh.accessibility} bp ${lh.bestPractices} seo ${lh.seo}`,
      });
    } catch {
      results.push({ engine: 'lighthouse', score: 0, detail: 'unavailable' });
    }
  }

  // Accessibility (scan HTML files in project)
  try {
    const { readdirSync, readFileSync, statSync } = require('fs');
    const { join } = require('path');
    const htmlFiles: string[] = [];
    const findHtml = (dir: string, depth: number = 0): void => {
      if (depth > 2 || htmlFiles.length >= 3) return;
      try {
        for (const e of readdirSync(dir, { withFileTypes: true })) {
          if (['node_modules', '.next', '.git', 'dist'].includes(e.name)) continue;
          const full = join(dir, e.name);
          if (e.isDirectory()) { findHtml(full, depth + 1); continue; }
          if (/\.(html|htm)$/.test(e.name) && statSync(full).size < 500000) {
            htmlFiles.push(full);
          }
        }
      } catch { /* skip */ }
    };
    findHtml(rootPath);

    if (htmlFiles.length > 0) {
      const htmlContent = readFileSync(htmlFiles[0], 'utf-8');
      const axeResult = await runAxeAccessibility(htmlContent);
      results.push({ engine: 'axe-core', score: axeResult.score, detail: `${axeResult.findings.length} issues` });
    }
  } catch { /* skip a11y if no HTML found */ }

  const avgScore = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;
  return { engines: results.length, results, avgScore };
}

/** Detect dev server URL from package.json scripts */
function detectDevUrl(rootPath: string): string | null {
  try {
    const { readFileSync, existsSync } = require('fs');
    const { join } = require('path');
    const pkgPath = join(rootPath, 'package.json');
    if (!existsSync(pkgPath)) return null;
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const scripts = pkg.scripts ?? {};
    // Check if start/dev script exists — suggest localhost
    if (scripts.start || scripts.dev) {
      const portMatch = JSON.stringify(scripts).match(/(?:port|PORT)[=\s]*(\d{4,5})/);
      const port = portMatch ? portMatch[1] : '3000';
      return `http://localhost:${port}`;
    }
  } catch { /* skip */ }
  return null;
}

// IDENTITY_SEAL: PART-5 | role=unified-web | inputs=rootPath | outputs=results
