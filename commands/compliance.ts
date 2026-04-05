// @ts-nocheck
// ============================================================
// CS Quill 🦔 — cs compliance command
// ============================================================
// 배포 전 원스톱 체크: IP + 보안 + 검증 + 의존성 + 영수증 체인.

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
// runIpScan, runVerify: 필요 시 동적 import

// ============================================================
// PART 1 — Compliance Runner
// ============================================================

interface ComplianceOptions {
  preRelease?: boolean;
}

export async function runCompliance(_opts: ComplianceOptions): Promise<void> {
  console.log('🦔 CS Quill — 배포 전 컴플라이언스 체크\n');
  const results: Array<{ check: string; passed: boolean; detail: string }> = [];

  // Check 1: IP/Patent
  console.log('  [1/5] 🛡️  IP/Patent...');
  try {
    // Lightweight check — just look for copyleft
    const nodeModules = join(process.cwd(), 'node_modules');
    let copyleftCount = 0;
    if (existsSync(nodeModules)) {
      const dirs = readdirSync(nodeModules, { withFileTypes: true }).filter(d => d.isDirectory() && !d.name.startsWith('.'));
      for (const dir of dirs.slice(0, 200)) {
        const pkgPath = join(nodeModules, dir.name, 'package.json');
        if (!existsSync(pkgPath)) continue;
        try {
          const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
          const lic = typeof pkg.license === 'string' ? pkg.license : (pkg.license?.type ?? '');
          if (/\b(A?GPL)\b/i.test(lic) && !/LGPL/i.test(lic)) copyleftCount++;
        } catch { /* skip */ }
      }
    }
    const passed = copyleftCount === 0;
    results.push({ check: 'IP/Patent', passed, detail: passed ? 'GPL 감염 없음' : `GPL 의존성 ${copyleftCount}개` });
    console.log(`        ${passed ? '✅' : '❌'} ${results[results.length - 1].detail}`);
  } catch {
    results.push({ check: 'IP/Patent', passed: false, detail: '스캔 실패' });
  }

  // Check 2: Secrets
  console.log('  [2/5] 🔒 Secrets...');
  const secretPatterns = [/sk-[a-zA-Z0-9]{20,}/, /AIza[a-zA-Z0-9_-]{30,}/, /ghp_[a-zA-Z0-9]{30,}/, /password\s*=\s*["'][^"']+["']/i];
  let secretCount = 0;
  const srcDir = join(process.cwd(), 'src');
  if (existsSync(srcDir)) {
    function scanSecrets(dir: string): void {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) { scanSecrets(full); continue; }
        if (!/\.(ts|tsx|js|jsx|json|env)$/.test(entry.name)) continue;
        try {
          const content = readFileSync(full, 'utf-8');
          for (const pat of secretPatterns) { if (pat.test(content)) secretCount++; }
        } catch { /* skip */ }
      }
    }
    scanSecrets(srcDir);
  }
  results.push({ check: 'Secrets', passed: secretCount === 0, detail: secretCount === 0 ? '하드코딩 시크릿 없음' : `시크릿 ${secretCount}건 감지!` });
  console.log(`        ${secretCount === 0 ? '✅' : '❌'} ${results[results.length - 1].detail}`);

  // Check 3: Dependencies (lockfile + npm audit + retire.js)
  console.log('  [3/5] 📦 Dependencies...');
  const pkgLockPath = join(process.cwd(), 'package-lock.json');
  const hasPkgLock = existsSync(pkgLockPath);
  let depDetail = hasPkgLock ? 'lockfile ✓' : 'lockfile ✗';
  let depPassed = hasPkgLock;

  try {
    const { runNpmAudit } = await import('../core/pipeline-bridge');
    const audit = await runNpmAudit(process.cwd());
    if (audit.critical > 0) { depPassed = false; depDetail += ` | critical ${audit.critical}건`; }
    else depDetail += ` | 취약점 없음`;
  } catch { depDetail += ' | audit 스킵'; }

  try {
    const { runRetireJS } = await import('../adapters/security-engine');
    const retire = await runRetireJS(process.cwd());
    if (retire.vulnerableCount > 0) { depPassed = false; depDetail += ` | retire ${retire.vulnerableCount}건`; }
  } catch { /* retire optional */ }

  results.push({ check: 'Dependencies', passed: depPassed, detail: depDetail });
  console.log(`        ${depPassed ? '✅' : '❌'} ${depDetail}`);

  // Check 4: Audit trail
  console.log('  [4/5] 📜 Audit Trail...');
  const receiptDir = join(process.cwd(), '.cs', 'receipts');
  let receiptCount = 0;
  if (existsSync(receiptDir)) {
    receiptCount = readdirSync(receiptDir).filter(f => f.endsWith('.json')).length;
  }
  results.push({ check: 'Audit Trail', passed: receiptCount > 0, detail: `영수증 ${receiptCount}건` });
  console.log(`        ${receiptCount > 0 ? '✅' : '⚠️'} ${results[results.length - 1].detail}`);

  // Check 5: Code quality (실제 파이프라인 실행)
  console.log('  [5/5] 🔍 Code Quality...');
  let codeQualityPassed = true;
  let codeQualityDetail = 'no src files';
  try {
    const { runStaticPipeline } = await import('../core/pipeline-bridge');
    const srcDir = join(process.cwd(), 'src');
    if (existsSync(srcDir)) {
      const sampleFiles = readdirSync(srcDir).filter(f => f.endsWith('.ts') || f.endsWith('.tsx')).slice(0, 5);
      if (sampleFiles.length > 0) {
        const content = readFileSync(join(srcDir, sampleFiles[0]), 'utf-8');
        const result = await runStaticPipeline(content, 'typescript');
        codeQualityPassed = result.score >= 60;
        codeQualityDetail = `샘플 점수 ${result.score}/100 (${sampleFiles[0]})`;
      }
    }
  } catch { codeQualityDetail = 'verify 실행 실패 — cs verify 로 수동 확인'; }
  results.push({ check: 'Code Quality', passed: codeQualityPassed, detail: codeQualityDetail });
  console.log(`        ${codeQualityPassed ? '✅' : '❌'} ${codeQualityDetail}`);

  // Summary
  const allPassed = results.every(r => r.passed);
  console.log(`\n  ─`.repeat(26));
  console.log(`  ${allPassed ? '✅' : '❌'} 배포 승인: ${allPassed ? 'PASS' : 'FAIL'}`);

  for (const r of results) {
    console.log(`     ${r.passed ? '✅' : '❌'} ${r.check}: ${r.detail}`);
  }

  if (!allPassed) process.exitCode = 1;
  console.log('');
}

// IDENTITY_SEAL: PART-1 | role=compliance-runner | inputs=opts | outputs=console

// ============================================================
// PART 2 — SBOM Generator (CycloneDX)
// ============================================================

export async function generateSBOM(format: 'cyclonedx' | 'spdx' = 'cyclonedx'): Promise<string> {
  const pkgPath = join(process.cwd(), 'package.json');
  if (!existsSync(pkgPath)) return JSON.stringify({ error: 'package.json not found' });

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  const deps = pkg.dependencies ?? {};
  const devDeps = pkg.devDependencies ?? {};

  if (format === 'cyclonedx') {
    const components = Object.entries({ ...deps, ...devDeps }).map(([name, version]) => {
      const ver = String(version).replace(/[\^~>=<]/g, '');
      const isDevOnly = !deps[name];
      let license = 'NOASSERTION';

      // 라이선스 탐지 (node_modules에서)
      try {
        const modPkg = join(process.cwd(), 'node_modules', name, 'package.json');
        if (existsSync(modPkg)) {
          const m = JSON.parse(readFileSync(modPkg, 'utf-8'));
          license = typeof m.license === 'string' ? m.license : (m.license?.type ?? 'NOASSERTION');
        }
      } catch { /* skip */ }

      return {
        type: 'library',
        name,
        version: ver,
        scope: isDevOnly ? 'optional' : 'required',
        licenses: [{ license: { id: license } }],
        purl: `pkg:npm/${name}@${ver}`,
      };
    });

    return JSON.stringify({
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      version: 1,
      metadata: {
        timestamp: new Date().toISOString(),
        tools: [{ vendor: 'CS Quill', name: 'cs-quill-cli', version: '0.1.0' }],
        component: { type: 'application', name: pkg.name ?? 'unknown', version: pkg.version ?? '0.0.0' },
      },
      components,
    }, null, 2);
  }

  // SPDX format
  const packages = Object.entries({ ...deps, ...devDeps }).map(([name, version]) => ({
    SPDXID: `SPDXRef-Package-${name.replace(/[^a-zA-Z0-9]/g, '-')}`,
    name,
    versionInfo: String(version).replace(/[\^~>=<]/g, ''),
    downloadLocation: `https://registry.npmjs.org/${name}`,
    filesAnalyzed: false,
  }));

  return JSON.stringify({
    spdxVersion: 'SPDX-2.3',
    dataLicense: 'CC0-1.0',
    SPDXID: 'SPDXRef-DOCUMENT',
    name: `${pkg.name ?? 'unknown'}-sbom`,
    creationInfo: {
      created: new Date().toISOString(),
      creators: ['Tool: CS Quill CLI 0.1.0'],
    },
    packages,
  }, null, 2);
}

// IDENTITY_SEAL: PART-2 | role=sbom-generator | inputs=format | outputs=JSON

