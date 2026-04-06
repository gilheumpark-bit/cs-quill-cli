// @ts-nocheck — external library wrapper, types handled at runtime
// ============================================================
// CS Quill 🦔 — cs audit command
// ============================================================
// 16영역 프로젝트 건강도 감사. 로컬, $0.
// 원본 lib/code-studio/audit/audit-engine.ts 호출.

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs';
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
// PART 2 — 16-Domain Category Aggregation
// ============================================================

const DOMAIN_CATEGORIES: Record<string, string[]> = {
  'Code Quality': ['naming', 'complexity', 'duplication', 'style'],
  'Architecture':  ['modularity', 'coupling', 'cohesion', 'layering'],
  'Reliability':   ['error-handling', 'testing', 'typing', 'edge-cases'],
  'Operations':    ['logging', 'config', 'docs', 'security'],
};

interface CategoryScore {
  category: string;
  domains: Array<{ name: string; score: number }>;
  average: number;
  grade: string;
}

function aggregateByCategory(areas: Array<{ name: string; score: number }>): CategoryScore[] {
  const results: CategoryScore[] = [];

  for (const [category, domainNames] of Object.entries(DOMAIN_CATEGORIES)) {
    const matched = areas.filter(a =>
      domainNames.some(d => a.name.toLowerCase().includes(d)),
    );
    const domains = matched.length > 0
      ? matched.map(a => ({ name: a.name, score: a.score }))
      : domainNames.map(d => ({ name: d, score: 0 }));

    const average = domains.length > 0
      ? Math.round(domains.reduce((s, d) => s + d.score, 0) / domains.length)
      : 0;

    const grade = average >= 90 ? 'A+' : average >= 80 ? 'A' : average >= 70 ? 'B' :
      average >= 60 ? 'C' : average >= 50 ? 'D' : 'F';

    results.push({ category, domains, average, grade });
  }

  return results;
}

// IDENTITY_SEAL: PART-2 | role=category-aggregation | inputs=areas | outputs=CategoryScore[]

// ============================================================
// PART 3 — SARIF Export with Schema Validation
// ============================================================

interface SarifResult {
  ruleId: string;
  level: 'error' | 'warning' | 'note' | 'none';
  message: { text: string };
  locations?: Array<{
    physicalLocation?: {
      artifactLocation?: { uri: string };
      region?: { startLine: number; endLine?: number };
    };
  }>;
  properties?: Record<string, unknown>;
}

function buildSarifOutput(report: any, rootPath: string): object {
  const sarifResults: SarifResult[] = [];

  // Build SARIF rules from all 16 areas
  const rules: Array<{ id: string; name: string; shortDescription: { text: string } }> = [];

  for (const area of report.areas ?? []) {
    const ruleId = `cs-quill/audit/${area.name.toLowerCase().replace(/\s+/g, '-')}`;
    rules.push({
      id: ruleId,
      name: area.name,
      shortDescription: { text: `${area.name} audit domain (score: ${area.score}/100)` },
    });

    // Areas below threshold generate results
    if (area.score < 80) {
      const level: SarifResult['level'] = area.score < 30 ? 'error' : area.score < 60 ? 'warning' : 'note';
      const findings = area.findings ?? [];

      if (findings.length > 0) {
        for (const finding of findings) {
          const text = typeof finding === 'string' ? finding : finding.message ?? String(finding);
          const location = typeof finding === 'object' && finding.file ? {
            physicalLocation: {
              artifactLocation: { uri: finding.file },
              ...(finding.line ? { region: { startLine: finding.line } } : {}),
            },
          } : undefined;

          sarifResults.push({
            ruleId,
            level,
            message: { text: `[${area.name}] ${text}` },
            ...(location ? { locations: [location] } : {}),
            properties: { score: area.score, domain: area.name },
          });
        }
      } else {
        sarifResults.push({
          ruleId,
          level,
          message: { text: `[${area.name}] score ${area.score}/100` },
          properties: { score: area.score, domain: area.name },
        });
      }
    }
  }

  // Urgent items
  for (const msg of report.urgent ?? []) {
    sarifResults.push({
      ruleId: 'cs-quill/audit/urgent',
      level: 'error',
      message: { text: typeof msg === 'string' ? msg : (msg as { message?: string }).message ?? String(msg) },
    });
  }

  const sarif = {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0' as const,
    runs: [{
      tool: {
        driver: {
          name: 'CS Quill Audit',
          version: '0.1.0',
          informationUri: 'https://github.com/cs-quill',
          rules,
        },
      },
      results: sarifResults,
      invocations: [{
        executionSuccessful: !report.hardGateFail,
        endTimeUtc: new Date().toISOString(),
      }],
    }],
  };

  // Validate required SARIF 2.1.0 fields
  if (!sarif.$schema || sarif.version !== '2.1.0' || !Array.isArray(sarif.runs)) {
    throw new Error('SARIF schema validation failed: missing required fields');
  }
  for (const run of sarif.runs) {
    if (!run.tool?.driver?.name || !Array.isArray(run.results)) {
      throw new Error('SARIF schema validation failed: run missing tool.driver.name or results');
    }
  }

  return sarif;
}

// IDENTITY_SEAL: PART-3 | role=sarif-export | inputs=report,rootPath | outputs=sarifObject

// ============================================================
// PART 4 — Trend Comparison
// ============================================================

const TREND_FILE = '.cs/audit-history.json';

interface AuditSnapshot {
  timestamp: string;
  totalScore: number;
  areas: Array<{ name: string; score: number }>;
}

function loadPreviousAudit(rootPath: string): AuditSnapshot | null {
  const historyPath = join(rootPath, TREND_FILE);
  if (!existsSync(historyPath)) return null;
  try {
    const history: AuditSnapshot[] = JSON.parse(readFileSync(historyPath, 'utf-8'));
    return history.length > 0 ? history[history.length - 1] : null;
  } catch {
    return null;
  }
}

function saveAuditSnapshot(rootPath: string, report: any): void {
  const historyPath = join(rootPath, TREND_FILE);
  let history: AuditSnapshot[] = [];
  try {
    if (existsSync(historyPath)) {
      history = JSON.parse(readFileSync(historyPath, 'utf-8'));
    }
  } catch { /* start fresh */ }

  history.push({
    timestamp: new Date().toISOString(),
    totalScore: report.totalScore ?? 0,
    areas: (report.areas ?? []).map((a: any) => ({ name: a.name, score: a.score })),
  });

  // Keep last 50 entries
  if (history.length > 50) history = history.slice(-50);

  const dir = join(rootPath, '.cs');
  if (!existsSync(dir)) {
    require('fs').mkdirSync(dir, { recursive: true });
  }
  writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf-8');
}

function printTrendComparison(current: any, previous: AuditSnapshot): void {
  const totalDelta = (current.totalScore ?? 0) - previous.totalScore;
  const arrow = totalDelta > 0 ? '📈' : totalDelta < 0 ? '📉' : '➡️';
  const sign = totalDelta > 0 ? '+' : '';

  console.log(`\n  ${arrow} 트렌드 비교 (vs ${previous.timestamp.slice(0, 10)}):`);
  console.log(`     전체 점수: ${previous.totalScore} → ${current.totalScore ?? 0} (${sign}${totalDelta})`);

  const prevMap = new Map<string, number>();
  for (const a of previous.areas) prevMap.set(a.name, a.score);

  const improved: string[] = [];
  const regressed: string[] = [];

  for (const area of current.areas ?? []) {
    const prevScore = prevMap.get(area.name);
    if (prevScore === undefined) continue;
    const delta = area.score - prevScore;
    if (delta >= 5) improved.push(`${area.name} (+${delta})`);
    else if (delta <= -5) regressed.push(`${area.name} (${delta})`);
  }

  if (improved.length > 0) {
    console.log(`     ✅ 개선: ${improved.join(', ')}`);
  }
  if (regressed.length > 0) {
    console.log(`     ⚠️  후퇴: ${regressed.join(', ')}`);
  }
  if (improved.length === 0 && regressed.length === 0) {
    console.log(`     ── 유의미한 변화 없음`);
  }
}

// IDENTITY_SEAL: PART-4 | role=trend-comparison | inputs=report,rootPath | outputs=console

// ============================================================
// PART 5 — Audit Runner
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

  // Run audit engine via pipeline-bridge
  const { runProjectAudit, formatAuditReport } = require('../core/pipeline-bridge');

  const report = await runProjectAudit(rootPath, (area: string, index: number, total: number) => {
    const bar = '█'.repeat(Math.round((index / total) * 20)) + '░'.repeat(20 - Math.round((index / total) * 20));
    process.stdout.write(`\r  [${bar}] ${index}/${total} ${area.padEnd(20)}`);
  });

  // Clear progress line
  process.stdout.write('\r' + ' '.repeat(60) + '\r');

  const duration = Math.round(performance.now() - startTime);

  // ── JSON output ──
  if (opts.format === 'json') {
    const categories = aggregateByCategory(report.areas ?? []);
    console.log(JSON.stringify({ ...report, categories, duration }, null, 2));
    saveAuditSnapshot(rootPath, report);
    return;
  }

  // ── SARIF output ──
  if (opts.format === 'sarif') {
    const sarif = buildSarifOutput(report, rootPath);
    console.log(JSON.stringify(sarif, null, 2));
    saveAuditSnapshot(rootPath, report);
    return;
  }

  // ── Human-readable output ──
  console.log(formatAuditReport(report, 'ko'));
  console.log(`\n  소요 시간: ${duration}ms`);

  // Category aggregation summary
  const categories = aggregateByCategory(report.areas ?? []);
  if (categories.length > 0) {
    console.log('\n  📊 카테고리별 요약:');
    for (const cat of categories) {
      const bar = '█'.repeat(Math.round(cat.average / 5)) + '░'.repeat(20 - Math.round(cat.average / 5));
      console.log(`     [${cat.grade}] ${cat.category.padEnd(16)} ${bar} ${cat.average}/100`);
    }
  }

  // Improvement suggestions
  if (report.urgent && report.urgent.length > 0) {
    console.log('\n  💡 가장 시급한 조치:');
    for (let i = 0; i < Math.min(3, report.urgent.length); i++) {
      const item = report.urgent[i];
      const msg = typeof item === 'string' ? item : (item as { message?: string }).message ?? String(item);
      console.log(`     ${i + 1}. ${msg}`);
    }
  }

  // Trend comparison
  if (opts.trend !== false) {
    const previous = loadPreviousAudit(rootPath);
    if (previous) {
      printTrendComparison(report, previous);
    }
  }

  // Save snapshot for future trend comparison
  saveAuditSnapshot(rootPath, report);

  // Session recording
  try {
    const { recordCommand, recordScore } = require('../core/session');
    recordCommand('audit');
    recordScore('audit', report.totalScore);
  } catch { /* skip */ }

  // Set exit code if hard gate failed
  if (report.hardGateFail) {
    process.exitCode = 1;
  }
}

// Export internal helpers for testing
export { aggregateByCategory, buildSarifOutput, saveAuditSnapshot, loadPreviousAudit, printTrendComparison };

// IDENTITY_SEAL: PART-5 | role=audit-runner | inputs=opts | outputs=console
