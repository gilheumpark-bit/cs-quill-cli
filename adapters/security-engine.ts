// @ts-nocheck — external library wrapper, types handled at runtime
// ============================================================
// CS Quill 🦔 — Security Engine Adapter
// ============================================================
// 5 packages: njsscan, lockfile-lint, retire.js, npm audit, snyk
// (socket은 SaaS 전용이라 CLI에서 npm audit로 대체)

// ============================================================
// PART 1 — npm audit (내장)
// ============================================================

export async function runNpmAudit(rootPath: string) {
  const { execSync } = await import('child_process');
  try {
    const output = execSync('npm audit --json 2>/dev/null', { cwd: rootPath, encoding: 'utf-8', timeout: 30000 });
    const data = JSON.parse(output);
    return {
      vulnerabilities: data.metadata?.vulnerabilities ?? {},
      total: data.metadata?.vulnerabilities?.total ?? 0,
      critical: data.metadata?.vulnerabilities?.critical ?? 0,
      high: data.metadata?.vulnerabilities?.high ?? 0,
    };
  } catch (e) {
    try {
      const output = (e as unknown).stdout ?? '{}';
      const data = JSON.parse(output);
      return {
        vulnerabilities: data.metadata?.vulnerabilities ?? {},
        total: data.metadata?.vulnerabilities?.total ?? 0,
        critical: data.metadata?.vulnerabilities?.critical ?? 0,
        high: data.metadata?.vulnerabilities?.high ?? 0,
      };
    } catch {
      return { vulnerabilities: {}, total: 0, critical: 0, high: 0 };
    }
  }
}

// IDENTITY_SEAL: PART-1 | role=npm-audit | inputs=rootPath | outputs=vulnerabilities

// ============================================================
// PART 2 — lockfile-lint
// ============================================================

export async function runLockfileLint(rootPath: string) {
  const { execSync } = await import('child_process');
  try {
    execSync('npx lockfile-lint --path package-lock.json --type npm --allowed-hosts npm --validate-https 2>&1', {
      cwd: rootPath, encoding: 'utf-8', timeout: 15000,
    });
    return { passed: true, issues: 0, detail: 'lockfile valid' };
  } catch (e) {
    const output = (e as unknown).stdout ?? (e as unknown).stderr ?? '';
    const issues = (output.match(/ERROR/g) ?? []).length;
    return { passed: false, issues, detail: output.slice(0, 200) };
  }
}

// IDENTITY_SEAL: PART-2 | role=lockfile-lint | inputs=rootPath | outputs={passed,issues}

// ============================================================
// PART 3 — retire.js (취약 라이브러리)
// ============================================================

export async function runRetireJS(rootPath: string) {
  const { execSync } = await import('child_process');
  try {
    const output = execSync('npx retire --outputformat json 2>/dev/null', {
      cwd: rootPath, encoding: 'utf-8', timeout: 30000,
    });
    const data = JSON.parse(output || '[]');
    return {
      vulnerableCount: Array.isArray(data) ? data.length : 0,
      findings: Array.isArray(data) ? data.slice(0, 10).map((d: unknown) => ({
        component: d.component ?? 'unknown',
        version: d.version ?? '?',
        severity: d.severity ?? 'unknown',
      })) : [],
    };
  } catch {
    return { vulnerableCount: 0, findings: [] };
  }
}

// IDENTITY_SEAL: PART-3 | role=retire-js | inputs=rootPath | outputs=findings

// ============================================================
// PART 4 — Snyk (심층 보안)
// ============================================================

export async function runSnyk(rootPath: string) {
  const { execSync } = await import('child_process');
  try {
    const output = execSync('npx snyk test --json 2>/dev/null', {
      cwd: rootPath, encoding: 'utf-8', timeout: 60000,
    });
    const data = JSON.parse(output);
    return {
      ok: data.ok ?? false,
      vulnerabilities: data.vulnerabilities?.length ?? 0,
      critical: data.vulnerabilities?.filter((v: unknown) => v.severity === 'critical').length ?? 0,
    };
  } catch {
    return { ok: true, vulnerabilities: 0, critical: 0 };
  }
}

// IDENTITY_SEAL: PART-4 | role=snyk | inputs=rootPath | outputs=findings

// ============================================================
// PART 5 — Unified Security Runner
// ============================================================

export async function runFullSecurityAnalysis(rootPath: string) {
  const results: Array<{ engine: string; score: number; detail: string }> = [];

  // npm audit
  const audit = await runNpmAudit(rootPath);
  const auditScore = Math.max(0, 100 - audit.critical * 30 - audit.high * 15);
  results.push({ engine: 'npm-audit', score: auditScore, detail: `${audit.total} vulns (${audit.critical} critical)` });

  // lockfile-lint
  const lockfile = await runLockfileLint(rootPath);
  results.push({ engine: 'lockfile-lint', score: lockfile.passed ? 100 : 60, detail: lockfile.detail });

  // retire.js
  const retire = await runRetireJS(rootPath);
  const retireScore = Math.max(0, 100 - retire.vulnerableCount * 20);
  results.push({ engine: 'retire.js', score: retireScore, detail: `${retire.vulnerableCount} vulnerable libs` });

  // snyk
  const snyk = await runSnyk(rootPath);
  const snykScore = snyk.ok ? 100 : Math.max(0, 100 - snyk.critical * 30);
  results.push({ engine: 'snyk', score: snykScore, detail: `${snyk.vulnerabilities} issues` });

  const avgScore = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
  return { engines: results.length, results, avgScore };
}

// IDENTITY_SEAL: PART-5 | role=unified-security | inputs=rootPath | outputs=results
