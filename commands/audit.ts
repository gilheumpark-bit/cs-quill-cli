// @ts-nocheck — external library wrapper, types handled at runtime
// ============================================================
// CS Quill 🦔 — cs audit command
// ============================================================
// 16영역 프로젝트 건강도 감사. 로컬, $0.
// 원본 lib/code-studio/audit/audit-engine.ts 호출.

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname, relative } from 'path';

// ============================================================
// PART 1 — Context Builder
// ============================================================

const IGNORE_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', '.cs']);
const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.json']);

interface FileEntry {
  path: string;
  content: string;
}

function collectFiles(rootPath: string): FileEntry[] {
  const files: FileEntry[] = [];

  function walk(dir: string): void {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || IGNORE_DIRS.has(entry.name)) continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (CODE_EXTENSIONS.has(extname(entry.name))) {
        try {
          files.push({ path: relative(rootPath, fullPath), content: readFileSync(fullPath, 'utf-8') });
        } catch { /* skip unreadable */ }
      }
    }
  }

  walk(rootPath);
  return files;
}

function loadPackageJson(rootPath: string): Record<string, unknown> | null {
  const pkgPath = join(rootPath, 'package.json');
  if (!existsSync(pkgPath)) return null;
  try {
    return JSON.parse(readFileSync(pkgPath, 'utf-8'));
  } catch {
    return null;
  }
}

// IDENTITY_SEAL: PART-1 | role=context-builder | inputs=rootPath | outputs=FileEntry[],packageJson

// ============================================================
// PART 2 — Audit Runner
// ============================================================

interface AuditOptions {
  format: string;
  trend?: boolean;
}

export async function runAudit(opts: AuditOptions): Promise<void> {
  const rootPath = process.cwd();
  const startTime = performance.now();

  console.log('🦔 CS Quill — 16영역 프로젝트 감사\n');

  // Collect files
  const files = collectFiles(rootPath);
  if (files.length === 0) {
    console.log('  ⚠️  감사할 파일이 없습니다.');
    return;
  }
  console.log(`  📁 ${files.length}개 파일 수집됨\n`);

  // Build audit context
  const packageJson = loadPackageJson(rootPath);
  const ctx = {
    files,
    packageJson,
    rootPath,
    gitInfo: null,
  };

  // Run audit engine
  const { runProjectAudit, formatAuditReport } = await import('../core/pipeline-bridge');

  const report = runProjectAudit(ctx as never, (area, index, total) => {
    const bar = '█'.repeat(Math.round((index / total) * 20)) + '░'.repeat(20 - Math.round((index / total) * 20));
    process.stdout.write(`\r  [${bar}] ${index}/${total} ${area.padEnd(20)}`);
  });

  // Clear progress line
  process.stdout.write('\r' + ' '.repeat(60) + '\r');

  const duration = Math.round(performance.now() - startTime);

  // Output
  if (opts.format === 'json') {
    console.log(JSON.stringify({ ...report, duration }, null, 2));
    return;
  }

  if (opts.format === 'sarif') {
    const sarif = {
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      version: '2.1.0',
      runs: [{
        tool: { driver: { name: 'CS Quill Audit', version: '0.1.0' } },
        results: report.urgent.map((item: { area: string; severity: string; message: string; file?: string }) => ({
          ruleId: `cs-quill/audit/${item.area}`,
          level: item.severity === 'critical' ? 'error' : item.severity === 'high' ? 'error' : 'warning',
          message: { text: item.message },
          locations: item.file ? [{ physicalLocation: { artifactLocation: { uri: item.file } } }] : [],
        })),
      }],
    };
    console.log(JSON.stringify(sarif, null, 2));
    return;
  }

  // Use the existing formatAuditReport from audit-engine
  console.log(formatAuditReport(report, 'ko'));
  console.log(`\n  소요 시간: ${duration}ms`);

  // Improvement suggestions
  if (report.urgent && report.urgent.length > 0) {
    console.log('\n  💡 가장 시급한 조치:');
    for (const item of report.urgent.slice(0, 3)) {
      console.log(`     ${item.rank}. [${item.area}] ${item.message}`);
    }
  }

  // Session recording
  try {
    const { recordCommand, recordScore } = await import('../core/session');
    recordCommand('audit');
    recordScore('audit', report.totalScore);
  } catch { /* skip */ }

  // Set exit code if hard gate failed
  if (report.hardGateFail) {
    process.exitCode = 1;
  }
}

// IDENTITY_SEAL: PART-2 | role=audit-runner | inputs=opts | outputs=console
