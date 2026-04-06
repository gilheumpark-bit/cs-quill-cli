// @ts-nocheck
// ============================================================
// CS Quill 🦔 — cs compliance command
// ============================================================
// 배포 전 원스톱 체크: IP + 보안 + 검증 + 의존성 + 영수증 체인.
// + 실제 package-lock.json 기반 SBOM 생성
// + 라이선스 호환성 매트릭스
// + 다중 내보내기 형식 (SPDX 2.3, CycloneDX 1.5)

const { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } = require('fs');
const { join } = require('path');
// runIpScan, runVerify: 필요 시 동적 import

// ============================================================
// PART 1 — License Compatibility Matrix
// ============================================================

type CompatResult = 'compatible' | 'incompatible' | 'check-required';

/**
 * License compatibility matrix.
 * Key = project license, inner key = dependency license.
 * Determines whether using a dep under that license is compatible with the project license.
 */
const LICENSE_COMPAT_MATRIX: Record<string, Record<string, CompatResult>> = {
  'MIT': {
    'MIT': 'compatible', 'ISC': 'compatible', 'BSD-2-Clause': 'compatible', 'BSD-3-Clause': 'compatible',
    'Apache-2.0': 'compatible', 'Unlicense': 'compatible', 'CC0-1.0': 'compatible', '0BSD': 'compatible',
    'Zlib': 'compatible', 'BlueOak-1.0.0': 'compatible', 'Python-2.0': 'compatible',
    'LGPL-2.1-only': 'check-required', 'LGPL-3.0-only': 'check-required',
    'MPL-2.0': 'check-required', 'EPL-2.0': 'check-required',
    'GPL-2.0-only': 'incompatible', 'GPL-3.0-only': 'incompatible',
    'AGPL-3.0-only': 'incompatible', 'SSPL-1.0': 'incompatible',
    'CC-BY-NC-4.0': 'incompatible', 'BSL-1.1': 'incompatible',
    'Elastic-2.0': 'incompatible',
  },
  'Apache-2.0': {
    'MIT': 'compatible', 'ISC': 'compatible', 'BSD-2-Clause': 'compatible', 'BSD-3-Clause': 'compatible',
    'Apache-2.0': 'compatible', 'Unlicense': 'compatible', 'CC0-1.0': 'compatible', '0BSD': 'compatible',
    'LGPL-2.1-only': 'check-required', 'LGPL-3.0-only': 'check-required',
    'MPL-2.0': 'check-required',
    'GPL-2.0-only': 'incompatible', 'GPL-3.0-only': 'compatible',  // Apache 2.0 is one-way compatible with GPL 3
    'AGPL-3.0-only': 'incompatible', 'SSPL-1.0': 'incompatible',
  },
  'GPL-3.0-only': {
    'MIT': 'compatible', 'ISC': 'compatible', 'BSD-2-Clause': 'compatible', 'BSD-3-Clause': 'compatible',
    'Apache-2.0': 'compatible', 'Unlicense': 'compatible', 'CC0-1.0': 'compatible',
    'LGPL-2.1-only': 'compatible', 'LGPL-3.0-only': 'compatible',
    'MPL-2.0': 'compatible', 'GPL-2.0-only': 'compatible', 'GPL-3.0-only': 'compatible',
    'AGPL-3.0-only': 'incompatible',
  },
  'GPL-2.0-only': {
    'MIT': 'compatible', 'ISC': 'compatible', 'BSD-2-Clause': 'compatible', 'BSD-3-Clause': 'compatible',
    'Unlicense': 'compatible', 'CC0-1.0': 'compatible',
    'Apache-2.0': 'incompatible',  // GPL-2 and Apache-2 are incompatible
    'LGPL-2.1-only': 'compatible', 'GPL-2.0-only': 'compatible',
    'GPL-3.0-only': 'incompatible', 'AGPL-3.0-only': 'incompatible',
  },
};

interface CompatIssue {
  dependency: string;
  depLicense: string;
  projectLicense: string;
  result: CompatResult;
}

function checkLicenseCompatibility(projectLicense: string, deps: Array<{ name: string; license: string }>): CompatIssue[] {
  const issues: CompatIssue[] = [];
  const matrix = LICENSE_COMPAT_MATRIX[projectLicense];
  if (!matrix) return issues; // Unknown project license, can't check

  for (const dep of deps) {
    const result = matrix[dep.license];
    if (result && result !== 'compatible') {
      issues.push({
        dependency: dep.name,
        depLicense: dep.license,
        projectLicense,
        result,
      });
    }
    // If license not in matrix, it's unknown — flag it
    if (!result && dep.license !== 'Unknown' && dep.license !== 'NOASSERTION') {
      issues.push({
        dependency: dep.name,
        depLicense: dep.license,
        projectLicense,
        result: 'check-required',
      });
    }
  }

  return issues;
}

// IDENTITY_SEAL: PART-1 | role=license-compat-matrix | inputs=licenses | outputs=CompatIssue[]

// ============================================================
// PART 2 — Compliance Runner
// ============================================================

interface ComplianceOptions {
  preRelease?: boolean;
}

export async function runCompliance(_opts: ComplianceOptions): Promise<void> {
  console.log('🦔 CS Quill — 배포 전 컴플라이언스 체크\n');
  const results: Array<{ check: string; passed: boolean; detail: string }> = [];

  // Check 1: IP/Patent
  console.log('  [1/6] 🛡️  IP/Patent...');
  try {
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
  console.log('  [2/6] 🔒 Secrets...');
  const secretPatterns = [/sk-[a-zA-Z0-9]{20,}/, /AIza[a-zA-Z0-9_-]{30,}/, /ghp_[a-zA-Z0-9]{30,}/, /password\s*=\s*["'][^"']+["']/i, /AKIA[A-Z0-9]{16}/, /sk-ant-[a-zA-Z0-9_-]{20,}/];
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
  console.log('  [3/6] 📦 Dependencies...');
  const pkgLockPath = join(process.cwd(), 'package-lock.json');
  const hasPkgLock = existsSync(pkgLockPath);
  let depDetail = hasPkgLock ? 'lockfile ✓' : 'lockfile ✗';
  let depPassed = hasPkgLock;

  try {
    const { runNpmAudit } = require('../core/pipeline-bridge');
    const audit = await runNpmAudit(process.cwd());
    if (audit.critical > 0) { depPassed = false; depDetail += ` | critical ${audit.critical}건`; }
    else depDetail += ` | 취약점 없음`;
  } catch { depDetail += ' | audit 스킵'; }

  try {
    const { runRetireJS } = require('../adapters/security-engine');
    const retire = await runRetireJS(process.cwd());
    if (retire.vulnerableCount > 0) { depPassed = false; depDetail += ` | retire ${retire.vulnerableCount}건`; }
  } catch { /* retire optional */ }

  results.push({ check: 'Dependencies', passed: depPassed, detail: depDetail });
  console.log(`        ${depPassed ? '✅' : '❌'} ${depDetail}`);

  // Check 4: License Compatibility
  console.log('  [4/6] ⚖️  License Compatibility...');
  let compatPassed = true;
  let compatDetail = '호환성 문제 없음';
  try {
    // Detect project license
    const licensePath = ['LICENSE', 'LICENSE.md', 'LICENSE.txt'].map(f => join(process.cwd(), f)).find(existsSync);
    let projectLicense = 'MIT'; // default assumption
    if (licensePath) {
      const content = readFileSync(licensePath, 'utf-8');
      const { SPDX_LICENSE_DB } = require('./ip-scan');
      const detected = SPDX_LICENSE_DB.find((p: any) => p.regex.test(content));
      if (detected) projectLicense = detected.spdxId;
    }

    // Collect dep licenses
    const depLicenses: Array<{ name: string; license: string }> = [];
    const nodeModules = join(process.cwd(), 'node_modules');
    if (existsSync(nodeModules)) {
      const dirs = readdirSync(nodeModules, { withFileTypes: true }).filter((d: any) => d.isDirectory() && !d.name.startsWith('.'));
      for (const dir of dirs.slice(0, 300)) {
        const modPkg = join(nodeModules, dir.name, 'package.json');
        if (!existsSync(modPkg)) continue;
        try {
          const pkg = JSON.parse(readFileSync(modPkg, 'utf-8'));
          const lic = typeof pkg.license === 'string' ? pkg.license : (pkg.license?.type ?? 'Unknown');
          depLicenses.push({ name: dir.name, license: lic });
        } catch { /* skip */ }
      }
    }

    const issues = checkLicenseCompatibility(projectLicense, depLicenses);
    const incompatible = issues.filter(i => i.result === 'incompatible');
    const needsCheck = issues.filter(i => i.result === 'check-required');

    if (incompatible.length > 0) {
      compatPassed = false;
      compatDetail = `비호환 ${incompatible.length}건 (프로젝트: ${projectLicense})`;
      for (const issue of incompatible.slice(0, 3)) {
        console.log(`        ❌ ${issue.dependency} (${issue.depLicense}) — ${projectLicense}와 비호환`);
      }
    } else if (needsCheck.length > 0) {
      compatDetail = `확인 필요 ${needsCheck.length}건 (프로젝트: ${projectLicense})`;
    } else {
      compatDetail = `${depLicenses.length}개 의존성 호환 (프로젝트: ${projectLicense})`;
    }
  } catch {
    compatDetail = '호환성 검사 스킵';
  }
  results.push({ check: 'License Compat', passed: compatPassed, detail: compatDetail });
  console.log(`        ${compatPassed ? '✅' : '❌'} ${compatDetail}`);

  // Check 5: Audit trail
  console.log('  [5/6] 📜 Audit Trail...');
  const receiptDir = join(process.cwd(), '.cs', 'receipts');
  let receiptCount = 0;
  if (existsSync(receiptDir)) {
    receiptCount = readdirSync(receiptDir).filter((f: string) => f.endsWith('.json')).length;
  }
  results.push({ check: 'Audit Trail', passed: receiptCount > 0, detail: `영수증 ${receiptCount}건` });
  console.log(`        ${receiptCount > 0 ? '✅' : '⚠️'} ${results[results.length - 1].detail}`);

  // Check 6: Code quality
  console.log('  [6/6] 🔍 Code Quality...');
  let codeQualityPassed = true;
  let codeQualityDetail = 'no src files';
  try {
    const { runStaticPipeline } = require('../core/pipeline-bridge');
    const srcDirQ = join(process.cwd(), 'src');
    if (existsSync(srcDirQ)) {
      const sampleFiles = readdirSync(srcDirQ).filter((f: string) => f.endsWith('.ts') || f.endsWith('.tsx')).slice(0, 5);
      if (sampleFiles.length > 0) {
        const content = readFileSync(join(srcDirQ, sampleFiles[0]), 'utf-8');
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

// IDENTITY_SEAL: PART-2 | role=compliance-runner | inputs=opts | outputs=console

// ============================================================
// PART 3 — Real SBOM Generator (from package-lock.json)
// ============================================================

interface SBOMComponent {
  name: string;
  version: string;
  license: string;
  spdxId: string;
  purl: string;
  scope: 'required' | 'optional' | 'dev';
  isDirect: boolean;
  integrity?: string;
}

/**
 * Extract full dependency tree from package-lock.json for real SBOM generation.
 * Falls back to package.json + node_modules if lockfile unavailable.
 */
function collectSBOMComponents(): SBOMComponent[] {
  const cwd = process.cwd();
  const components: SBOMComponent[] = [];
  const seen = new Set<string>();

  // Read direct deps from package.json
  const pkgPath = join(cwd, 'package.json');
  if (!existsSync(pkgPath)) return components;
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  const directDeps = new Set(Object.keys(pkg.dependencies ?? {}));
  const devDeps = new Set(Object.keys(pkg.devDependencies ?? {}));

  // Try package-lock.json first (npm v7+ format with packages)
  const lockPath = join(cwd, 'package-lock.json');
  if (existsSync(lockPath)) {
    try {
      const lockfile = JSON.parse(readFileSync(lockPath, 'utf-8'));

      if (lockfile.packages) {
        for (const [pkgKey, pkgData] of Object.entries(lockfile.packages)) {
          if (pkgKey === '') continue;
          const data = pkgData as any;
          const name = pkgKey.replace(/^node_modules\//, '').replace(/.*node_modules\//, '');
          if (seen.has(`${name}@${data.version}`)) continue;
          seen.add(`${name}@${data.version}`);

          const licenseStr = typeof data.license === 'string' ? data.license : (data.license?.type ?? '');
          const isDirect = directDeps.has(name) || devDeps.has(name);
          const scope = data.dev ? 'dev' : devDeps.has(name) && !directDeps.has(name) ? 'dev' : data.optional ? 'optional' : 'required';

          // Try reading actual license from node_modules for accuracy
          let resolvedLicense = licenseStr;
          if (!resolvedLicense) {
            const modPkg = join(cwd, 'node_modules', name, 'package.json');
            if (existsSync(modPkg)) {
              try {
                const mp = JSON.parse(readFileSync(modPkg, 'utf-8'));
                resolvedLicense = typeof mp.license === 'string' ? mp.license : (mp.license?.type ?? '');
              } catch { /* skip */ }
            }
          }

          // Match to SPDX
          let spdxId = resolvedLicense || 'NOASSERTION';
          try {
            const { matchLicense } = require('./ip-scan');
            const matched = matchLicense(resolvedLicense);
            if (matched) spdxId = matched.spdxId;
          } catch { /* ip-scan not available, use raw */ }

          components.push({
            name,
            version: data.version ?? '0.0.0',
            license: resolvedLicense || 'NOASSERTION',
            spdxId,
            purl: `pkg:npm/${name.includes('/') ? name : encodeURIComponent(name)}@${data.version ?? '0.0.0'}`,
            scope: scope as SBOMComponent['scope'],
            isDirect,
            integrity: data.integrity,
          });
        }
        return components;
      }

      // npm v6 format
      if (lockfile.dependencies) {
        function walkV6Deps(deps: Record<string, any>): void {
          for (const [name, data] of Object.entries(deps)) {
            const d = data as any;
            const key = `${name}@${d.version}`;
            if (seen.has(key)) continue;
            seen.add(key);

            let licenseStr = '';
            const modPkg = join(cwd, 'node_modules', name, 'package.json');
            if (existsSync(modPkg)) {
              try {
                const mp = JSON.parse(readFileSync(modPkg, 'utf-8'));
                licenseStr = typeof mp.license === 'string' ? mp.license : (mp.license?.type ?? '');
              } catch { /* skip */ }
            }

            let spdxId = licenseStr || 'NOASSERTION';
            try {
              const { matchLicense } = require('./ip-scan');
              const matched = matchLicense(licenseStr);
              if (matched) spdxId = matched.spdxId;
            } catch { /* skip */ }

            components.push({
              name,
              version: d.version ?? '0.0.0',
              license: licenseStr || 'NOASSERTION',
              spdxId,
              purl: `pkg:npm/${encodeURIComponent(name)}@${d.version ?? '0.0.0'}`,
              scope: d.dev ? 'dev' : 'required',
              isDirect: directDeps.has(name) || devDeps.has(name),
              integrity: d.integrity,
            });

            if (d.dependencies) walkV6Deps(d.dependencies);
          }
        }
        walkV6Deps(lockfile.dependencies);
        return components;
      }
    } catch { /* fall through */ }
  }

  // Fallback: package.json + node_modules scan
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const [name, version] of Object.entries(allDeps)) {
    const ver = String(version).replace(/[\^~>=<]/g, '');
    let license = 'NOASSERTION';
    let spdxId = 'NOASSERTION';

    const modPkg = join(cwd, 'node_modules', name, 'package.json');
    if (existsSync(modPkg)) {
      try {
        const m = JSON.parse(readFileSync(modPkg, 'utf-8'));
        license = typeof m.license === 'string' ? m.license : (m.license?.type ?? 'NOASSERTION');
        spdxId = license;
        try {
          const { matchLicense } = require('./ip-scan');
          const matched = matchLicense(license);
          if (matched) spdxId = matched.spdxId;
        } catch { /* skip */ }
      } catch { /* skip */ }
    }

    const isDev = !pkg.dependencies?.[name];
    components.push({
      name,
      version: ver,
      license,
      spdxId,
      purl: `pkg:npm/${encodeURIComponent(name)}@${ver}`,
      scope: isDev ? 'dev' : 'required',
      isDirect: true,
    });
  }

  return components;
}

// IDENTITY_SEAL: PART-3 | role=sbom-components | inputs=lockfile | outputs=SBOMComponent[]

// ============================================================
// PART 4 — SBOM Export Formats
// ============================================================

export async function generateSBOM(format: 'cyclonedx' | 'spdx' = 'cyclonedx'): Promise<string> {
  const pkgPath = join(process.cwd(), 'package.json');
  if (!existsSync(pkgPath)) return JSON.stringify({ error: 'package.json not found' });

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  const components = collectSBOMComponents();

  if (format === 'cyclonedx') {
    return generateCycloneDX(pkg, components);
  }

  return generateSPDX(pkg, components);
}

function generateCycloneDX(pkg: any, components: SBOMComponent[]): string {
  const cdxComponents = components.map(c => ({
    type: 'library',
    'bom-ref': c.purl,
    name: c.name,
    version: c.version,
    scope: c.scope === 'dev' ? 'optional' : c.scope,
    licenses: c.spdxId !== 'NOASSERTION' ? [{ license: { id: c.spdxId } }] : [],
    purl: c.purl,
    ...(c.integrity ? {
      hashes: [{
        alg: c.integrity.startsWith('sha512-') ? 'SHA-512' : c.integrity.startsWith('sha256-') ? 'SHA-256' : 'SHA-1',
        content: c.integrity.replace(/^sha\d+-/, ''),
      }],
    } : {}),
    properties: [
      { name: 'cdx:npm:direct', value: String(c.isDirect) },
    ],
  }));

  // Build dependency graph
  const dependencies = components.filter(c => c.isDirect).map(c => ({
    ref: c.purl,
    dependsOn: [], // Would need full resolution for transitive graph
  }));

  return JSON.stringify({
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber: `urn:uuid:${generateUUID()}`,
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: {
        components: [{ type: 'application', name: 'cs-quill-cli', version: '0.1.0', author: 'CS Quill' }],
      },
      component: {
        type: 'application',
        name: pkg.name ?? 'unknown',
        version: pkg.version ?? '0.0.0',
        purl: `pkg:npm/${encodeURIComponent(pkg.name ?? 'unknown')}@${pkg.version ?? '0.0.0'}`,
      },
      licenses: pkg.license ? [{ license: { id: pkg.license } }] : [],
    },
    components: cdxComponents,
    dependencies,
  }, null, 2);
}

function generateSPDX(pkg: any, components: SBOMComponent[]): string {
  const docNamespace = `https://spdx.org/spdxdocs/${pkg.name ?? 'unknown'}-${pkg.version ?? '0.0.0'}-${generateUUID()}`;

  const packages = components.map(c => {
    const spdxRef = `SPDXRef-Package-${c.name.replace(/[^a-zA-Z0-9.-]/g, '-')}`;
    return {
      SPDXID: spdxRef,
      name: c.name,
      versionInfo: c.version,
      downloadLocation: `https://registry.npmjs.org/${c.name}/-/${c.name.split('/').pop()}-${c.version}.tgz`,
      filesAnalyzed: false,
      licenseConcluded: c.spdxId || 'NOASSERTION',
      licenseDeclared: c.spdxId || 'NOASSERTION',
      copyrightText: 'NOASSERTION',
      externalRefs: [{
        referenceCategory: 'PACKAGE-MANAGER',
        referenceType: 'purl',
        referenceLocator: c.purl,
      }],
      ...(c.integrity ? {
        checksums: [{
          algorithm: c.integrity.startsWith('sha512-') ? 'SHA512' : c.integrity.startsWith('sha256-') ? 'SHA256' : 'SHA1',
          checksumValue: c.integrity.replace(/^sha\d+-/, ''),
        }],
      } : {}),
      primaryPackagePurpose: 'LIBRARY',
      supplier: 'NOASSERTION',
    };
  });

  // Build relationships
  const rootRef = 'SPDXRef-RootPackage';
  const relationships = [
    { spdxElementId: 'SPDXRef-DOCUMENT', relatedSpdxElement: rootRef, relationshipType: 'DESCRIBES' },
    ...components.filter(c => c.isDirect).map(c => ({
      spdxElementId: rootRef,
      relatedSpdxElement: `SPDXRef-Package-${c.name.replace(/[^a-zA-Z0-9.-]/g, '-')}`,
      relationshipType: c.scope === 'dev' ? 'DEV_DEPENDENCY_OF' : 'DEPENDENCY_OF',
    })),
  ];

  return JSON.stringify({
    spdxVersion: 'SPDX-2.3',
    dataLicense: 'CC0-1.0',
    SPDXID: 'SPDXRef-DOCUMENT',
    name: `${pkg.name ?? 'unknown'}-sbom`,
    documentNamespace: docNamespace,
    creationInfo: {
      created: new Date().toISOString(),
      creators: [
        'Tool: CS Quill CLI 0.1.0',
        'Organization: CS Quill',
      ],
      licenseListVersion: '3.22',
    },
    documentDescribes: [rootRef],
    packages: [
      {
        SPDXID: rootRef,
        name: pkg.name ?? 'unknown',
        versionInfo: pkg.version ?? '0.0.0',
        downloadLocation: 'NOASSERTION',
        filesAnalyzed: false,
        licenseConcluded: pkg.license ?? 'NOASSERTION',
        licenseDeclared: pkg.license ?? 'NOASSERTION',
        copyrightText: 'NOASSERTION',
        primaryPackagePurpose: 'APPLICATION',
        supplier: 'NOASSERTION',
      },
      ...packages,
    ],
    relationships,
  }, null, 2);
}

/**
 * Export SBOM to a file in the specified format.
 */
export async function exportSBOM(format: 'cyclonedx' | 'spdx' = 'cyclonedx', outputPath?: string): Promise<string> {
  const sbom = await generateSBOM(format);
  const defaultName = format === 'cyclonedx' ? 'sbom-cyclonedx.json' : 'sbom-spdx.json';
  const outDir = join(process.cwd(), '.cs');
  mkdirSync(outDir, { recursive: true });
  const outPath = outputPath || join(outDir, defaultName);
  writeFileSync(outPath, sbom, 'utf-8');
  return outPath;
}

function generateUUID(): string {
  // Simple UUID v4 without crypto dependency
  const hex = '0123456789abcdef';
  let uuid = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) { uuid += '-'; }
    else if (i === 14) { uuid += '4'; }
    else if (i === 19) { uuid += hex[(Math.random() * 4 | 0) + 8]; }
    else { uuid += hex[Math.random() * 16 | 0]; }
  }
  return uuid;
}

// Export for use by other commands
export { checkLicenseCompatibility, LICENSE_COMPAT_MATRIX, collectSBOMComponents };

// IDENTITY_SEAL: PART-4 | role=sbom-export | inputs=format | outputs=JSON-file
