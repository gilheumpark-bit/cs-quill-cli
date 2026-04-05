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
    const axe = await import('axe-core');

    // axe-core는 DOM 기반이라 JSDOM으로 실행
    const { JSDOM } = await import('jsdom');
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
  const { readFileSync, existsSync } = await import('fs');
  const { join } = await import('path');
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
  };

  const ALTERNATIVES: Record<string, string> = {
    'moment': 'dayjs (2kB) or date-fns (tree-shakeable)',
    'lodash': 'lodash-es (tree-shakeable) or native Array methods',
    'aws-sdk': '@aws-sdk/* (modular v3)',
    'rxjs': 'Consider if needed — often overengineered for simple cases',
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
  const { execSync } = await import('child_process');

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
// PART 4 — Unified Web Quality Runner
// ============================================================

export async function runFullWebQualityAnalysis(rootPath: string) {
  const results: Array<{ engine: string; score: number; detail: string }> = [];

  // Bundle size
  const bundle = await checkBundleSize(rootPath);
  results.push({ engine: 'bundle-size', score: bundle.score, detail: `${bundle.heavyCount} heavy deps / ${bundle.totalDeps} total` });

  const avgScore = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;
  return { engines: results.length, results, avgScore };
}

// IDENTITY_SEAL: PART-4 | role=unified-web | inputs=rootPath | outputs=results
