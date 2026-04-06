// ============================================================
// CS Quill 🦔 — cs ip-scan command
// ============================================================
// IP/특허/라이선스 스캔. 원본 patent-scanner.ts 확장.
// + SPDX 라이선스 식별자 데이터베이스
// + 향상된 정규식 패턴
// + 전이 의존성 스캔 (package-lock.json 기반)
// + 개선된 채점 가중치

const { readFileSync, readdirSync, statSync, existsSync } = require('fs');
const { join, extname, relative } = require('path');

// ============================================================
// PART 1 — SPDX License Database & Patterns
// ============================================================

/**
 * Comprehensive SPDX license identifier database.
 * Each entry includes: regex for detection, SPDX ID, copyleft status,
 * a risk tier (permissive / weak-copyleft / strong-copyleft / restrictive),
 * and whether commercial use is allowed.
 */
interface SPDXLicense {
  regex: RegExp;
  license: string;
  spdxId: string;
  copyleft: boolean;
  riskTier: 'permissive' | 'weak-copyleft' | 'strong-copyleft' | 'restrictive' | 'public-domain';
  commercialOk: boolean;
}

const SPDX_LICENSE_DB: SPDXLicense[] = [
  // Public domain
  { regex: /\bUnlicense\b/i, license: 'Unlicense', spdxId: 'Unlicense', copyleft: false, riskTier: 'public-domain', commercialOk: true },
  { regex: /\bCC0[-\s]1\.0\b|Creative Commons Zero/i, license: 'CC0-1.0', spdxId: 'CC0-1.0', copyleft: false, riskTier: 'public-domain', commercialOk: true },
  { regex: /\bWTFPL\b/i, license: 'WTFPL', spdxId: 'WTFPL', copyleft: false, riskTier: 'public-domain', commercialOk: true },
  { regex: /\b0BSD\b/i, license: '0BSD', spdxId: '0BSD', copyleft: false, riskTier: 'public-domain', commercialOk: true },

  // Permissive
  { regex: /\bMIT\s+License\b|\bMIT\b(?!\s*\/)/, license: 'MIT', spdxId: 'MIT', copyleft: false, riskTier: 'permissive', commercialOk: true },
  { regex: /Apache\s+License[,\s]+(?:Version\s+)?2\.0/i, license: 'Apache 2.0', spdxId: 'Apache-2.0', copyleft: false, riskTier: 'permissive', commercialOk: true },
  { regex: /Apache[-\s]2\.0/i, license: 'Apache 2.0', spdxId: 'Apache-2.0', copyleft: false, riskTier: 'permissive', commercialOk: true },
  { regex: /\bISC\s+License\b|\bISC\b/i, license: 'ISC', spdxId: 'ISC', copyleft: false, riskTier: 'permissive', commercialOk: true },
  { regex: /BSD\s+3[-\s]Clause/i, license: 'BSD-3-Clause', spdxId: 'BSD-3-Clause', copyleft: false, riskTier: 'permissive', commercialOk: true },
  { regex: /BSD\s+2[-\s]Clause/i, license: 'BSD-2-Clause', spdxId: 'BSD-2-Clause', copyleft: false, riskTier: 'permissive', commercialOk: true },
  { regex: /\bBSD[-\s]1[-\s]Clause\b/i, license: 'BSD-1-Clause', spdxId: 'BSD-1-Clause', copyleft: false, riskTier: 'permissive', commercialOk: true },
  { regex: /\bZlib\s+License\b|\bzlib\b/i, license: 'Zlib', spdxId: 'Zlib', copyleft: false, riskTier: 'permissive', commercialOk: true },
  { regex: /\bX11\s+License\b/i, license: 'X11', spdxId: 'X11', copyleft: false, riskTier: 'permissive', commercialOk: true },
  { regex: /\bBlueOak[-\s]1\.0\.0\b/i, license: 'BlueOak-1.0.0', spdxId: 'BlueOak-1.0.0', copyleft: false, riskTier: 'permissive', commercialOk: true },
  { regex: /\bArtistic[-\s]2\.0\b/i, license: 'Artistic-2.0', spdxId: 'Artistic-2.0', copyleft: false, riskTier: 'permissive', commercialOk: true },
  { regex: /Python[-\s]2\.0/i, license: 'Python-2.0', spdxId: 'Python-2.0', copyleft: false, riskTier: 'permissive', commercialOk: true },
  { regex: /\bPSF[-\s]2\.0\b/i, license: 'PSF-2.0', spdxId: 'PSF-2.0', copyleft: false, riskTier: 'permissive', commercialOk: true },

  // Weak copyleft
  { regex: /GNU\s+Lesser\s+General\s+Public\s+License\s*v?3/i, license: 'LGPL-3.0', spdxId: 'LGPL-3.0-only', copyleft: true, riskTier: 'weak-copyleft', commercialOk: true },
  { regex: /\bLGPL[-\s]3\.0\b/i, license: 'LGPL-3.0', spdxId: 'LGPL-3.0-only', copyleft: true, riskTier: 'weak-copyleft', commercialOk: true },
  { regex: /GNU\s+Lesser\s+General\s+Public\s+License\s*v?2/i, license: 'LGPL-2.1', spdxId: 'LGPL-2.1-only', copyleft: true, riskTier: 'weak-copyleft', commercialOk: true },
  { regex: /\bLGPL[-\s]2\.1\b/i, license: 'LGPL-2.1', spdxId: 'LGPL-2.1-only', copyleft: true, riskTier: 'weak-copyleft', commercialOk: true },
  { regex: /Mozilla\s+Public\s+License[,\s]*(?:Version\s+)?2\.0/i, license: 'MPL-2.0', spdxId: 'MPL-2.0', copyleft: true, riskTier: 'weak-copyleft', commercialOk: true },
  { regex: /\bMPL[-\s]2\.0\b/i, license: 'MPL-2.0', spdxId: 'MPL-2.0', copyleft: true, riskTier: 'weak-copyleft', commercialOk: true },
  { regex: /\bEPL[-\s]2\.0\b|Eclipse\s+Public\s+License\s*2/i, license: 'EPL-2.0', spdxId: 'EPL-2.0', copyleft: true, riskTier: 'weak-copyleft', commercialOk: true },
  { regex: /\bCDDL[-\s]1\.[01]\b/i, license: 'CDDL-1.0', spdxId: 'CDDL-1.0', copyleft: true, riskTier: 'weak-copyleft', commercialOk: true },

  // Strong copyleft
  { regex: /GNU\s+General\s+Public\s+License\s*(?:version\s+|v)?3/i, license: 'GPL-3.0', spdxId: 'GPL-3.0-only', copyleft: true, riskTier: 'strong-copyleft', commercialOk: false },
  { regex: /\bGPL[-\s]3\.0\b/i, license: 'GPL-3.0', spdxId: 'GPL-3.0-only', copyleft: true, riskTier: 'strong-copyleft', commercialOk: false },
  { regex: /GNU\s+General\s+Public\s+License\s*(?:version\s+|v)?2/i, license: 'GPL-2.0', spdxId: 'GPL-2.0-only', copyleft: true, riskTier: 'strong-copyleft', commercialOk: false },
  { regex: /\bGPL[-\s]2\.0\b/i, license: 'GPL-2.0', spdxId: 'GPL-2.0-only', copyleft: true, riskTier: 'strong-copyleft', commercialOk: false },
  { regex: /GNU\s+Affero\s+General\s+Public/i, license: 'AGPL-3.0', spdxId: 'AGPL-3.0-only', copyleft: true, riskTier: 'strong-copyleft', commercialOk: false },
  { regex: /\bAGPL[-\s]3\.0\b/i, license: 'AGPL-3.0', spdxId: 'AGPL-3.0-only', copyleft: true, riskTier: 'strong-copyleft', commercialOk: false },
  { regex: /\bEUPL[-\s]1\.[12]\b/i, license: 'EUPL-1.2', spdxId: 'EUPL-1.2', copyleft: true, riskTier: 'strong-copyleft', commercialOk: false },

  // Restrictive / Non-commercial
  { regex: /Creative\s+Commons.*(?:NC|NonCommercial)/i, license: 'CC-BY-NC', spdxId: 'CC-BY-NC-4.0', copyleft: false, riskTier: 'restrictive', commercialOk: false },
  { regex: /Creative\s+Commons.*(?:ND|NoDerivs)/i, license: 'CC-BY-ND', spdxId: 'CC-BY-ND-4.0', copyleft: false, riskTier: 'restrictive', commercialOk: true },
  { regex: /Creative\s+Commons.*(?:SA|ShareAlike)/i, license: 'CC-BY-SA', spdxId: 'CC-BY-SA-4.0', copyleft: true, riskTier: 'weak-copyleft', commercialOk: true },
  { regex: /\bSSPL\b|Server\s+Side\s+Public\s+License/i, license: 'SSPL', spdxId: 'SSPL-1.0', copyleft: true, riskTier: 'strong-copyleft', commercialOk: false },
  { regex: /\bBSL[-\s]1\.[01]\b|Business\s+Source\s+License/i, license: 'BSL-1.1', spdxId: 'BSL-1.1', copyleft: false, riskTier: 'restrictive', commercialOk: false },
  { regex: /\bElastic[-\s]2\.0\b|Elastic\s+License/i, license: 'Elastic-2.0', spdxId: 'Elastic-2.0', copyleft: false, riskTier: 'restrictive', commercialOk: false },
];

/**
 * Match a license string (from package.json or LICENSE file) to an SPDX entry.
 * Tries direct SPDX ID match first, then regex patterns.
 */
function matchLicense(licenseStr: string): SPDXLicense | null {
  if (!licenseStr) return null;

  // Direct SPDX ID match (fast path for package.json license fields)
  const directMatch = SPDX_LICENSE_DB.find(l => l.spdxId.toLowerCase() === licenseStr.toLowerCase());
  if (directMatch) return directMatch;

  // Regex match (for LICENSE file content or non-standard strings)
  for (const entry of SPDX_LICENSE_DB) {
    if (entry.regex.test(licenseStr)) return entry;
  }

  return null;
}

const SUSPICIOUS_PATTERNS: Array<{ regex: RegExp; description: string; severity: 'info' | 'warning' | 'critical' }> = [
  { regex: /stackoverflow\.com\/(?:questions|a)\//i, description: 'Stack Overflow 참조 (URL)', severity: 'info' },
  { regex: /github\.com\/[^\s]+\/blob\//i, description: 'GitHub 코드 직접 참조', severity: 'info' },
  { regex: /copied\s+from|taken\s+from|based\s+on|ported\s+from|adapted\s+from/i, description: '복사 출처 표기', severity: 'warning' },
  { regex: /all\s+rights?\s+reserved/i, description: 'All Rights Reserved', severity: 'critical' },
  { regex: /proprietary|confidential|trade\s+secret/i, description: '독점/기밀 표시', severity: 'critical' },
  { regex: /patent\s+pending|patented|patent\s+no\.?/i, description: '특허 참조', severity: 'critical' },
  { regex: /TODO:\s*remove|HACK|FIXME:\s*license|FIXME:\s*copyright/i, description: 'IP 관련 TODO', severity: 'warning' },
  { regex: /do\s+not\s+(?:copy|distribute|redistribute)/i, description: '배포 금지 표시', severity: 'critical' },
  { regex: /(?:licensed?\s+(?:under|to)\s+)[A-Z][a-zA-Z\s]+(?:Corp|Inc|LLC|Ltd)/i, description: '기업 전용 라이선스', severity: 'warning' },
  { regex: /\bcopyright\s+\d{4}\b(?!.*(?:MIT|Apache|BSD|ISC))/i, description: '저작권 표시 (라이선스 불명)', severity: 'info' },
];

// IDENTITY_SEAL: PART-1 | role=spdx-database | inputs=none | outputs=SPDX_LICENSE_DB,SUSPICIOUS_PATTERNS

// ============================================================
// PART 2 — Transitive Dependency Scanner
// ============================================================

interface DepLicense {
  name: string;
  version: string;
  license: string;
  spdxId: string;
  copyleft: boolean;
  riskTier: string;
  isDirect: boolean;
  dependencyPath: string[];
}

/**
 * Scan transitive dependencies from package-lock.json.
 * Falls back to node_modules scanning if lockfile is unavailable.
 */
function scanDependencyLicenses(rootPath: string): DepLicense[] {
  const results: DepLicense[] = [];
  const seen = new Set<string>();

  // Read direct dependencies from package.json
  const pkgPath = join(rootPath, 'package.json');
  let directDeps = new Set<string>();
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const allDirect = { ...pkg.dependencies, ...pkg.devDependencies };
      directDeps = new Set(Object.keys(allDirect));
    } catch { /* skip */ }
  }

  // Phase 1: Try package-lock.json for transitive dependency tree
  const lockPath = join(rootPath, 'package-lock.json');
  if (existsSync(lockPath)) {
    try {
      const lockfile = JSON.parse(readFileSync(lockPath, 'utf-8'));

      // npm v7+ lockfile format (packages key)
      if (lockfile.packages) {
        for (const [pkgKey, pkgData] of Object.entries(lockfile.packages)) {
          if (pkgKey === '') continue; // root package
          const data = pkgData as any;
          const name = pkgKey.replace(/^node_modules\//, '').replace(/.*node_modules\//, '');
          if (seen.has(name)) continue;
          seen.add(name);

          const licenseStr = typeof data.license === 'string' ? data.license : (data.license?.type ?? '');
          const matched = matchLicense(licenseStr);

          results.push({
            name,
            version: data.version ?? '?',
            license: matched?.license ?? (licenseStr || 'Unknown'),
            spdxId: matched?.spdxId ?? (licenseStr || 'NOASSERTION'),
            copyleft: matched?.copyleft ?? false,
            riskTier: matched?.riskTier ?? 'permissive',
            isDirect: directDeps.has(name),
            dependencyPath: [name],
          });
        }
      }

      // npm v6 lockfile format (dependencies key)
      if (lockfile.dependencies && results.length === 0) {
        function walkLockDeps(deps: Record<string, any>, path: string[]): void {
          for (const [name, data] of Object.entries(deps)) {
            const d = data as any;
            if (seen.has(name)) continue;
            seen.add(name);

            // Try to read license from node_modules
            const licenseStr = readLicenseFromNodeModules(rootPath, name);
            const matched = matchLicense(licenseStr);

            results.push({
              name,
              version: d.version ?? '?',
              license: matched?.license ?? (licenseStr || 'Unknown'),
              spdxId: matched?.spdxId ?? (licenseStr || 'NOASSERTION'),
              copyleft: matched?.copyleft ?? false,
              riskTier: matched?.riskTier ?? 'permissive',
              isDirect: directDeps.has(name),
              dependencyPath: [...path, name],
            });

            if (d.dependencies) {
              walkLockDeps(d.dependencies, [...path, name]);
            }
          }
        }
        walkLockDeps(lockfile.dependencies, []);
      }
    } catch { /* fall through to node_modules scan */ }
  }

  // Phase 2: Fall back to node_modules scan if lockfile didn't work
  if (results.length === 0) {
    const nodeModules = join(rootPath, 'node_modules');
    if (existsSync(nodeModules)) {
      scanNodeModulesDir(nodeModules, results, seen, directDeps);
    }
  }

  return results;
}

function readLicenseFromNodeModules(rootPath: string, name: string): string {
  const modPkgPath = join(rootPath, 'node_modules', name, 'package.json');
  if (!existsSync(modPkgPath)) return '';
  try {
    const pkg = JSON.parse(readFileSync(modPkgPath, 'utf-8'));
    return typeof pkg.license === 'string' ? pkg.license : (pkg.license?.type ?? '');
  } catch {
    return '';
  }
}

function scanNodeModulesDir(
  nodeModules: string,
  results: DepLicense[],
  seen: Set<string>,
  directDeps: Set<string>,
): void {
  try {
    const dirs = readdirSync(nodeModules, { withFileTypes: true });
    for (const dir of dirs) {
      if (!dir.isDirectory() || dir.name.startsWith('.')) continue;

      if (dir.name.startsWith('@')) {
        const scopedPath = join(nodeModules, dir.name);
        try {
          const scopedDirs = readdirSync(scopedPath, { withFileTypes: true });
          for (const sd of scopedDirs) {
            if (!sd.isDirectory()) continue;
            const fullName = `${dir.name}/${sd.name}`;
            if (seen.has(fullName)) continue;
            seen.add(fullName);
            const dep = readDepLicenseInfo(join(scopedPath, sd.name), fullName, directDeps.has(fullName));
            if (dep) results.push(dep);
          }
        } catch { /* skip */ }
      } else {
        if (seen.has(dir.name)) continue;
        seen.add(dir.name);
        const dep = readDepLicenseInfo(join(nodeModules, dir.name), dir.name, directDeps.has(dir.name));
        if (dep) results.push(dep);
      }
    }
  } catch { /* skip */ }
}

function readDepLicenseInfo(depPath: string, name: string, isDirect: boolean): DepLicense | null {
  const pkgPath = join(depPath, 'package.json');
  if (!existsSync(pkgPath)) return null;

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const licenseStr = typeof pkg.license === 'string' ? pkg.license : (typeof pkg.license === 'object' ? pkg.license.type : '');
    const matched = matchLicense(licenseStr);
    return {
      name,
      version: pkg.version ?? '?',
      license: matched?.license ?? (licenseStr || 'Unknown'),
      spdxId: matched?.spdxId ?? (licenseStr || 'NOASSERTION'),
      copyleft: matched?.copyleft ?? /GPL|AGPL|LGPL|MPL/i.test(licenseStr),
      riskTier: matched?.riskTier ?? 'permissive',
      isDirect,
      dependencyPath: [name],
    };
  } catch {
    return null;
  }
}

// IDENTITY_SEAL: PART-2 | role=transitive-dep-scanner | inputs=rootPath | outputs=DepLicense[]

// ============================================================
// PART 3 — Source Code Scanner
// ============================================================

interface CodeFinding {
  file: string;
  line: number;
  description: string;
  severity: 'info' | 'warning' | 'critical';
}

const IGNORE_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', '.nuxt', '.output', 'coverage', '.turbo']);

function scanSourceCode(rootPath: string): CodeFinding[] {
  const findings: CodeFinding[] = [];

  function walk(dir: string): void {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) { walk(fullPath); continue; }
      if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) continue;

      try {
        const content = readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          for (const pat of SUSPICIOUS_PATTERNS) {
            if (pat.regex.test(lines[i])) {
              findings.push({
                file: relative(rootPath, fullPath),
                line: i + 1,
                description: pat.description,
                severity: pat.severity,
              });
            }
          }
        }
      } catch { /* skip unreadable files */ }
    }
  }

  walk(rootPath);
  return findings;
}

// IDENTITY_SEAL: PART-3 | role=source-scanner | inputs=rootPath | outputs=CodeFinding[]

// ============================================================
// PART 4 — Scoring Engine
// ============================================================

interface IPScore {
  total: number;
  grade: string;
  breakdown: {
    criticalFindings: number;
    warningFindings: number;
    infoFindings: number;
    strongCopyleft: number;
    weakCopyleft: number;
    restrictive: number;
    unknownLicenses: number;
    transitiveRisks: number;
  };
}

function calculateIPScore(
  findings: CodeFinding[],
  depLicenses: DepLicense[],
): IPScore {
  const criticals = findings.filter(f => f.severity === 'critical').length;
  const warnings = findings.filter(f => f.severity === 'warning').length;
  const infos = findings.filter(f => f.severity === 'info').length;

  const strongCopyleft = depLicenses.filter(d => d.riskTier === 'strong-copyleft').length;
  const weakCopyleft = depLicenses.filter(d => d.riskTier === 'weak-copyleft').length;
  const restrictive = depLicenses.filter(d => d.riskTier === 'restrictive').length;
  const unknownLicenses = depLicenses.filter(d => d.license === 'Unknown').length;

  // Transitive risks: copyleft in non-direct dependencies
  const transitiveRisks = depLicenses.filter(d => !d.isDirect && d.copyleft).length;

  // Weighted scoring (out of 100)
  let score = 100;
  score -= criticals * 20;        // Critical findings: -20 each
  score -= warnings * 5;          // Warnings: -5 each
  score -= infos * 1;             // Info: -1 each
  score -= strongCopyleft * 15;   // Strong copyleft: -15 each
  score -= weakCopyleft * 5;      // Weak copyleft: -5 each
  score -= restrictive * 10;      // Restrictive: -10 each
  score -= unknownLicenses * 3;   // Unknown: -3 each
  score -= transitiveRisks * 8;   // Transitive copyleft: -8 each

  score = Math.max(0, Math.min(100, score));

  const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 55 ? 'C' : score >= 35 ? 'D' : 'F';

  return {
    total: score,
    grade,
    breakdown: {
      criticalFindings: criticals,
      warningFindings: warnings,
      infoFindings: infos,
      strongCopyleft,
      weakCopyleft,
      restrictive,
      unknownLicenses,
      transitiveRisks,
    },
  };
}

// IDENTITY_SEAL: PART-4 | role=scoring-engine | inputs=findings,deps | outputs=IPScore

// ============================================================
// PART 5 — IP Scan Runner
// ============================================================

export async function runIpScan(path: string, opts: Record<string, unknown>): Promise<void> {
  const rootPath = process.cwd();
  console.log('🦔 CS Quill — IP/특허/라이선스 스캔\n');

  // Project license
  const licensePath = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE', 'COPYING']
    .map(f => join(rootPath, f)).find(existsSync);
  if (licensePath) {
    const content = readFileSync(licensePath, 'utf-8');
    const detected = SPDX_LICENSE_DB.find(p => p.regex.test(content));
    const riskIcon = detected?.riskTier === 'permissive' ? '✅' : detected?.riskTier === 'public-domain' ? '🟢' : '⚠️';
    console.log(`  📄 프로젝트 라이선스: ${detected?.license ?? 'Unknown'} (${detected?.spdxId ?? 'N/A'}) ${riskIcon}`);
    if (detected) {
      console.log(`     리스크: ${detected.riskTier} | 상업용: ${detected.commercialOk ? '가능' : '불가'}`);
    }
  } else {
    console.log('  ⚠️  LICENSE 파일 없음');
  }

  // Dependency licenses (with transitive scanning)
  const lockExists = existsSync(join(rootPath, 'package-lock.json'));
  console.log(`\n  📦 의존성 라이선스 스캔${lockExists ? ' (package-lock.json 기반 전이 스캔)' : ' (node_modules 스캔)'}...`);
  const depLicenses = scanDependencyLicenses(rootPath);

  const directCount = depLicenses.filter(d => d.isDirect).length;
  const transitiveCount = depLicenses.filter(d => !d.isDirect).length;
  console.log(`     직접: ${directCount}개 | 전이: ${transitiveCount}개 | 총: ${depLicenses.length}개\n`);

  // Group by risk tier
  const byRisk = new Map<string, DepLicense[]>();
  for (const dep of depLicenses) {
    const existing = byRisk.get(dep.riskTier) ?? [];
    existing.push(dep);
    byRisk.set(dep.riskTier, existing);
  }

  const riskOrder = ['strong-copyleft', 'restrictive', 'weak-copyleft', 'permissive', 'public-domain'];
  const riskIcons: Record<string, string> = {
    'strong-copyleft': '🔴', 'restrictive': '🟠', 'weak-copyleft': '🟡', 'permissive': '✅', 'public-domain': '🟢',
  };

  for (const tier of riskOrder) {
    const deps = byRisk.get(tier);
    if (!deps || deps.length === 0) continue;
    console.log(`     ${riskIcons[tier] ?? '❓'} ${tier}: ${deps.length}개`);
  }

  // License distribution
  const licenseGroups = new Map<string, number>();
  for (const dep of depLicenses) {
    licenseGroups.set(dep.license, (licenseGroups.get(dep.license) ?? 0) + 1);
  }
  console.log('\n  📊 라이선스 분포:');
  for (const [license, count] of [...licenseGroups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    const matched = matchLicense(license);
    const icon = matched?.riskTier === 'strong-copyleft' ? '🔴' : matched?.riskTier === 'restrictive' ? '🟠' : matched?.riskTier === 'weak-copyleft' ? '🟡' : license === 'Unknown' ? '❓' : '✅';
    console.log(`     ${icon} ${license}: ${count}`);
  }

  // Copyleft infection chain
  const copyleftDeps = depLicenses.filter(d => d.riskTier === 'strong-copyleft');
  if (copyleftDeps.length > 0) {
    console.log(`\n  🔴 Strong Copyleft 감염 위험 (${copyleftDeps.length}개):`);
    for (const dep of copyleftDeps.slice(0, 10)) {
      const directLabel = dep.isDirect ? '[직접]' : '[전이]';
      console.log(`     - ${dep.name}@${dep.version} (${dep.spdxId}) ${directLabel}`);
    }
  }

  const unknownDeps = depLicenses.filter(d => d.license === 'Unknown');
  if (unknownDeps.length > 0) {
    console.log(`\n  ❓ 라이선스 불명 (${unknownDeps.length}개):`);
    for (const dep of unknownDeps.slice(0, 5)) {
      console.log(`     - ${dep.name}@${dep.version}`);
    }
  }

  // Source code patterns
  console.log('\n  🔍 소스 코드 패턴 스캔...');
  const findings = scanSourceCode(rootPath);

  const criticals = findings.filter(f => f.severity === 'critical');
  const warnings = findings.filter(f => f.severity === 'warning');

  if (criticals.length > 0) {
    console.log(`\n  🔴 Critical (${criticals.length}건):`);
    for (const f of criticals.slice(0, 10)) {
      console.log(`     ${f.file}:${f.line} — ${f.description}`);
    }
  }

  if (warnings.length > 0) {
    console.log(`\n  🟡 Warning (${warnings.length}건):`);
    for (const f of warnings.slice(0, 10)) {
      console.log(`     ${f.file}:${f.line} — ${f.description}`);
    }
  }

  // Score with improved weights
  const ipScore = calculateIPScore(findings, depLicenses);
  const icon = ipScore.grade === 'A' ? '🟢' : ipScore.grade === 'B' ? '🟡' : '🔴';

  console.log(`\n  ─`.repeat(26));
  console.log(`  ${icon} IP Score: ${ipScore.total}/100 (${ipScore.grade})`);
  console.log(`  의존성: ${depLicenses.length}개 (직접 ${directCount} + 전이 ${transitiveCount}) | 소스 패턴: ${findings.length}건`);

  const b = ipScore.breakdown;
  if (b.strongCopyleft > 0 || b.weakCopyleft > 0 || b.restrictive > 0) {
    console.log(`  리스크: 강한 copyleft ${b.strongCopyleft} | 약한 copyleft ${b.weakCopyleft} | 제한적 ${b.restrictive} | 불명 ${b.unknownLicenses}`);
  }

  // Actionable recommendations
  if (copyleftDeps.length > 0 || unknownDeps.length > 0) {
    console.log('\n  🔧 조치 추천:');
    for (const dep of copyleftDeps.slice(0, 3)) {
      console.log(`     ${dep.name} (${dep.spdxId}) → MIT/Apache 대안 패키지 검색 필요`);
    }
    if (unknownDeps.length > 0) {
      console.log('     미확인 라이선스 → npm info <패키지명> license 로 확인');
    }
  }

  try { const { recordCommand } = require('../core/session'); recordCommand('ip-scan'); } catch {}

  if (criticals.length > 0 || copyleftDeps.length > 0) {
    process.exitCode = 1;
  }
  console.log('');
}

// Export for use by other commands
export { SPDX_LICENSE_DB, matchLicense, scanDependencyLicenses, calculateIPScore };

// IDENTITY_SEAL: PART-5 | role=ip-scan-runner | inputs=path,opts | outputs=console
