// ============================================================
// CS Quill 🦔 — cs ip-scan command
// ============================================================
// IP/특허/라이선스 스캔. 원본 patent-scanner.ts 확장.
// + npm 의존성 라이선스 전수 스캔
// + GPL 감염 체크
// + 코드 유사도 경고

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname, relative } from 'path';

// ============================================================
// PART 1 — License Patterns
// ============================================================

const LICENSE_PATTERNS: Array<{ regex: RegExp; license: string; spdxId: string; copyleft: boolean }> = [
  { regex: /MIT License/i, license: 'MIT', spdxId: 'MIT', copyleft: false },
  { regex: /Apache License.*2\.0/i, license: 'Apache 2.0', spdxId: 'Apache-2.0', copyleft: false },
  { regex: /GNU General Public License.*v3/i, license: 'GPL-3.0', spdxId: 'GPL-3.0-only', copyleft: true },
  { regex: /GNU General Public License.*v2/i, license: 'GPL-2.0', spdxId: 'GPL-2.0-only', copyleft: true },
  { regex: /GNU Lesser General Public/i, license: 'LGPL', spdxId: 'LGPL-3.0-only', copyleft: true },
  { regex: /GNU Affero General Public/i, license: 'AGPL', spdxId: 'AGPL-3.0-only', copyleft: true },
  { regex: /BSD 3-Clause/i, license: 'BSD-3', spdxId: 'BSD-3-Clause', copyleft: false },
  { regex: /BSD 2-Clause/i, license: 'BSD-2', spdxId: 'BSD-2-Clause', copyleft: false },
  { regex: /ISC License/i, license: 'ISC', spdxId: 'ISC', copyleft: false },
  { regex: /Mozilla Public License.*2\.0/i, license: 'MPL-2.0', spdxId: 'MPL-2.0', copyleft: true },
  { regex: /Creative Commons.*NC/i, license: 'CC-NC', spdxId: 'CC-BY-NC-4.0', copyleft: false },
  { regex: /Unlicense/i, license: 'Unlicense', spdxId: 'Unlicense', copyleft: false },
];

const SUSPICIOUS_PATTERNS: Array<{ regex: RegExp; description: string; severity: 'info' | 'warning' | 'critical' }> = [
  { regex: /stackoverflow\.com/i, description: 'Stack Overflow 참조', severity: 'info' },
  { regex: /copied from|taken from|based on/i, description: '복사 출처 표기', severity: 'warning' },
  { regex: /all rights reserved/i, description: 'All Rights Reserved', severity: 'critical' },
  { regex: /proprietary|confidential/i, description: '독점/기밀 표시', severity: 'critical' },
  { regex: /patent pending|patented/i, description: '특허 참조', severity: 'critical' },
  { regex: /TODO:\s*remove|HACK|FIXME:\s*license/i, description: 'IP 관련 TODO', severity: 'warning' },
];

// IDENTITY_SEAL: PART-1 | role=patterns | inputs=none | outputs=LICENSE_PATTERNS,SUSPICIOUS_PATTERNS

// ============================================================
// PART 2 — Dependency License Scanner
// ============================================================

interface DepLicense {
  name: string;
  version: string;
  license: string;
  copyleft: boolean;
}

function scanDependencyLicenses(rootPath: string): DepLicense[] {
  const results: DepLicense[] = [];
  const nodeModules = join(rootPath, 'node_modules');
  if (!existsSync(nodeModules)) return results;

  try {
    const dirs = readdirSync(nodeModules, { withFileTypes: true });
    for (const dir of dirs) {
      if (!dir.isDirectory() || dir.name.startsWith('.')) continue;

      // Handle scoped packages
      if (dir.name.startsWith('@')) {
        const scopedPath = join(nodeModules, dir.name);
        const scopedDirs = readdirSync(scopedPath, { withFileTypes: true });
        for (const sd of scopedDirs) {
          if (!sd.isDirectory()) continue;
          const dep = readDepLicense(join(scopedPath, sd.name), `${dir.name}/${sd.name}`);
          if (dep) results.push(dep);
        }
      } else {
        const dep = readDepLicense(join(nodeModules, dir.name), dir.name);
        if (dep) results.push(dep);
      }
    }
  } catch { /* skip */ }

  return results;
}

function readDepLicense(depPath: string, name: string): DepLicense | null {
  const pkgPath = join(depPath, 'package.json');
  if (!existsSync(pkgPath)) return null;

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const license = typeof pkg.license === 'string' ? pkg.license : typeof pkg.license === 'object' ? pkg.license.type : 'Unknown';
    const copyleft = /GPL|AGPL|LGPL|MPL/i.test(license);
    return { name, version: pkg.version ?? '?', license, copyleft };
  } catch {
    return null;
  }
}

// IDENTITY_SEAL: PART-2 | role=dep-scanner | inputs=rootPath | outputs=DepLicense[]

// ============================================================
// PART 3 — Source Code Scanner
// ============================================================

interface CodeFinding {
  file: string;
  line: number;
  description: string;
  severity: 'info' | 'warning' | 'critical';
}

const IGNORE_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build']);

function scanSourceCode(rootPath: string): CodeFinding[] {
  const findings: CodeFinding[] = [];

  function walk(dir: string): void {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) { walk(fullPath); continue; }
      if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) continue;

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
    }
  }

  walk(rootPath);
  return findings;
}

// IDENTITY_SEAL: PART-3 | role=source-scanner | inputs=rootPath | outputs=CodeFinding[]

// ============================================================
// PART 4 — IP Scan Runner
// ============================================================

export async function runIpScan(path: string, opts: Record<string, unknown>): Promise<void> {
  const rootPath = process.cwd();
  console.log('🦔 CS Quill — IP/특허/라이선스 스캔\n');

  // Project license
  const licensePath = ['LICENSE', 'LICENSE.md', 'LICENSE.txt'].map(f => join(rootPath, f)).find(existsSync);
  if (licensePath) {
    const content = readFileSync(licensePath, 'utf-8');
    const detected = LICENSE_PATTERNS.find(p => p.regex.test(content));
    console.log(`  📄 프로젝트 라이선스: ${detected?.license ?? 'Unknown'}`);
  } else {
    console.log('  ⚠️  LICENSE 파일 없음');
  }

  // Dependency licenses
  console.log('\n  📦 의존성 라이선스 스캔...');
  const depLicenses = scanDependencyLicenses(rootPath);

  const licenseGroups = new Map<string, number>();
  const copyleftDeps: DepLicense[] = [];
  const unknownDeps: DepLicense[] = [];

  for (const dep of depLicenses) {
    licenseGroups.set(dep.license, (licenseGroups.get(dep.license) ?? 0) + 1);
    if (dep.copyleft) copyleftDeps.push(dep);
    if (dep.license === 'Unknown') unknownDeps.push(dep);
  }

  for (const [license, count] of [...licenseGroups.entries()].sort((a, b) => b[1] - a[1])) {
    const icon = /GPL|AGPL/i.test(license) ? '⚠️ ' : license === 'Unknown' ? '❓' : '✅';
    console.log(`     ${icon} ${license}: ${count}`);
  }

  if (copyleftDeps.length > 0) {
    console.log(`\n  🔴 Copyleft 감염 위험 (${copyleftDeps.length}개):`);
    for (const dep of copyleftDeps.slice(0, 10)) {
      console.log(`     - ${dep.name}@${dep.version} (${dep.license})`);
    }
  }

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
  const infos = findings.filter(f => f.severity === 'info');

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

  // Score
  const score = Math.max(0, 100 - criticals.length * 25 - warnings.length * 10 - copyleftDeps.length * 15);
  const grade = score >= 90 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : score >= 30 ? 'D' : 'F';
  const icon = grade === 'A' ? '🟢' : grade === 'B' ? '🟡' : '🔴';

  console.log(`\n  ─`.repeat(26));
  console.log(`  ${icon} IP Score: ${score}/100 (${grade})`);
  console.log(`  의존성: ${depLicenses.length}개 | 소스 패턴: ${findings.length}건 | Copyleft: ${copyleftDeps.length}개`);

  // Actionable recommendations
  if (copyleftDeps.length > 0) {
    console.log('\n  🔧 조치 추천:');
    for (const dep of copyleftDeps.slice(0, 3)) {
      console.log(`     ${dep.name} (${dep.license}) → MIT 대안 패키지 검색 필요`);
    }
  }
  if (unknownDeps.length > 0) {
    console.log('     미확인 라이선스 → npm info <패키지명> license 로 확인');
  }

  try { const { recordCommand } = require('../core/session'); recordCommand('ip-scan'); } catch {}

  if (criticals.length > 0 || copyleftDeps.length > 0) {
    process.exitCode = 1;
  }
  console.log('');
}

// IDENTITY_SEAL: PART-4 | role=ip-scan-runner | inputs=path,opts | outputs=console
