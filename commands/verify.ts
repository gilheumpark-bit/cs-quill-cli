// ============================================================
// CS Quill 🦔 — cs verify command
// ============================================================
// 8팀 병렬 전수검사. 로컬, $0, ~3초.
// 원본 lib/code-studio/pipeline 엔진을 그대로 호출.

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';

// ============================================================
// PART 1 — File Discovery
// ============================================================

// Dynamic: detect from multi-lang registry if available, fallback to TS/JS
let SUPPORTED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
try {
  const { getSupportedExtensions } = require('../adapters/multi-lang');
  SUPPORTED_EXTENSIONS = new Set(getSupportedExtensions());
} catch { /* multi-lang not available, TS/JS only */ }
const IGNORE_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', '.cs', '__tests__']);

interface SourceFile {
  path: string;
  relativePath: string;
  content: string;
  language: string;
}

const MAX_FILE_SIZE = 512 * 1024; // 512KB
const MAX_DEPTH = 15;
const MAX_FILES = 2000;

function discoverFiles(rootPath: string): SourceFile[] {
  const files: SourceFile[] = [];

  function walk(dir: string, depth: number = 0): void {
    if (depth > MAX_DEPTH || files.length >= MAX_FILES) return;
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }

    for (const entry of entries) {
      if (files.length >= MAX_FILES) break;
      if (entry.name.startsWith('.') || IGNORE_DIRS.has(entry.name)) continue;
      if (entry.isSymbolicLink()) continue; // symlink 공격 방지

      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, depth + 1);
      } else if (SUPPORTED_EXTENSIONS.has(extname(entry.name))) {
        try {
          const stat = statSync(fullPath);
          if (stat.size > MAX_FILE_SIZE) continue; // 대용량 파일 스킵
          const content = readFileSync(fullPath, 'utf-8');
          const ext = extname(entry.name);
          files.push({
            path: fullPath,
            relativePath: relative(rootPath, fullPath),
            content,
            language: ext === '.ts' || ext === '.tsx' ? 'typescript' : 'javascript',
          });
        } catch { /* 읽기 실패 시 스킵 */ }
      }
    }
  }

  try {
    const stat = statSync(rootPath);
    if (stat.isFile()) {
      if (stat.size > MAX_FILE_SIZE) return [];
      const content = readFileSync(rootPath, 'utf-8');
      const ext = extname(rootPath);
      return [{
        path: rootPath,
        relativePath: rootPath,
        content,
        language: ext === '.ts' || ext === '.tsx' ? 'typescript' : 'javascript',
      }];
    }
  } catch { return []; }

  walk(rootPath);
  return files;
}

function _detectLanguage(ext: string): string {
  return ext === '.ts' || ext === '.tsx' ? 'typescript' : 'javascript';
}

// IDENTITY_SEAL: PART-1 | role=file-discovery | inputs=rootPath | outputs=SourceFile[]

// ============================================================
// PART 2 — Pipeline Runner
// ============================================================

interface VerifyOptions {
  threshold: string;
  format: string;
  watch?: boolean;
  parallel?: boolean;
}

interface TeamResult {
  name: string;
  score: number;
  findings: number;
  blocking: boolean;
  passed: boolean;
  details: Array<{ line: number; message: string; severity: string }>;
}

interface _VerifyResult {
  files: number;
  teams: TeamResult[];
  overallScore: number;
  overallStatus: 'pass' | 'warn' | 'fail';
  duration: number;
}

export async function runVerify(path: string, opts: VerifyOptions): Promise<void> {
  const threshold = Math.max(0, Math.min(100, parseInt(opts.threshold, 10) || 77));
  const startTime = performance.now();
  const { printHeader, printScore, printSection, icons, colors } = await import('../core/terminal-compat');

  printHeader('8팀 검증');
  console.log('');

  // Discover files
  const files = discoverFiles(path);
  if (files.length === 0) {
    console.log(`  ${icons.warn}  검증할 파일이 없습니다.`);
    return;
  }
  console.log(`  ${icons.folder} ${files.length}개 파일 발견`);
  const useParallel = opts.parallel && files.length > 3;
  if (useParallel) console.log(`  ${icons.rocket} 워커풀 병렬 모드 (${Math.min(files.length, 4)} workers)`);
  console.log('');

  // Run pipeline on each file — try enhanced (AST) first, fallback to regex
  let useEnhanced = true;
  let enhancedImport: typeof import('../core/ast-bridge') | null = null;
  try {
    enhancedImport = await import('../core/ast-bridge');
  } catch {
    useEnhanced = false;
  }

  const { runStaticPipeline } = await import('../core/pipeline-bridge');

  const allTeamScores: Map<string, number[]> = new Map();
  const allTeamFindings: Map<string, number> = new Map();
  let totalFindings = 0;
  let astFindingsTotal = 0;

  // ── 파일 검증 함수 ──
  async function verifyOneFile(file: SourceFile) {
    if (useEnhanced && enhancedImport) {
      try {
        const enhanced = await enhancedImport.runEnhancedPipeline(file.content, file.language, file.relativePath);
        astFindingsTotal += enhanced.astFindings;
        const result = {
          teams: [] as Array<{ name: string; score: number; findings: string[] }>,
          overallScore: enhanced.combinedScore,
          overallStatus: enhanced.combinedScore >= 80 ? 'pass' : enhanced.combinedScore >= 60 ? 'warn' : 'fail',
        };
        const teamMap = new Map<string, { score: number; findings: string[] }>();
        for (const f of enhanced.findings) {
          const team = teamMap.get(f.team) ?? { score: 100, findings: [] };
          team.findings.push(f.message);
          if (f.severity === 'critical') team.score -= 25;
          else if (f.severity === 'error') team.score -= 10;
          else if (f.severity === 'warning') team.score -= 3;
          team.score = Math.max(0, team.score);
          teamMap.set(f.team, team);
        }
        for (const [name, data] of teamMap) {
          result.teams.push({ name, score: data.score, findings: data.findings });
        }
        return result;
      } catch {
        return await runStaticPipeline(file.content, file.language);
      }
    }
    return await runStaticPipeline(file.content, file.language);
  }

  // ── 병렬 or 순차 실행 ──
  if (useParallel) {
    const { runTasksInProcess, registerTaskHandler } = await import('../adapters/worker-pool');
    registerTaskHandler('verify-file', async (payload) => {
      const { content, language, relativePath } = payload as { content: string; language: string; relativePath: string };
      return await runStaticPipeline(content, language);
    });

    const tasks = files.map((f, i) => ({
      id: `v-${i}`,
      type: 'verify-file',
      payload: { content: f.content, language: f.language, relativePath: f.relativePath },
    }));

    const results = await runTasksInProcess(tasks, { maxWorkers: 4 }, (completed, total) => {
      process.stdout.write(`\r  ${icons.clock} ${completed}/${total} 파일 검증 완료`);
    });
    console.log('');

    for (const wr of results) {
      const result = wr.success ? wr.result as { teams?: Array<{ name: string; score: number; findings: string[] }>; stages?: Array<{ name: string; score: number; findings: string[] }> } : null;
      if (!result) continue;
      for (const stage of result.teams ?? result.stages ?? []) {
        const scores = allTeamScores.get(stage.name) ?? [];
        scores.push(stage.score);
        allTeamScores.set(stage.name, scores);
        const findings = allTeamFindings.get(stage.name) ?? 0;
        allTeamFindings.set(stage.name, findings + stage.findings.length);
        totalFindings += stage.findings.length;
      }
    }
  } else {
    for (const file of files) {
      const result = await verifyOneFile(file);
      for (const stage of result.teams ?? (result as any).stages ?? []) {
        const scores = allTeamScores.get(stage.name) ?? [];
        scores.push(stage.score);
        allTeamScores.set(stage.name, scores);
        const findings = allTeamFindings.get(stage.name) ?? 0;
        allTeamFindings.set(stage.name, findings + stage.findings.length);
        totalFindings += stage.findings.length;
      }
    }
  }

  // Aggregate team results
  const BLOCKING_TEAMS = new Set(['validation', 'release-ip']);
  const teams: TeamResult[] = [];

  for (const [name, scores] of allTeamScores) {
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const findings = allTeamFindings.get(name) ?? 0;
    const blocking = BLOCKING_TEAMS.has(name);
    teams.push({
      name,
      score: avgScore,
      findings,
      blocking,
      passed: blocking ? avgScore >= threshold : true,
      details: [],
    });
  }

  // AST summary (already included in enhanced pipeline if available)
  if (useEnhanced && astFindingsTotal > 0) {
    console.log(`\n  🔬 AST 심층분석: ${astFindingsTotal}건 추가 발견 (Level 2 정밀도)`);
  }

  const overallScore = Math.round(teams.reduce((s, t) => s + t.score, 0) / Math.max(teams.length, 1));
  const overallStatus = overallScore >= 80 ? 'pass' as const : overallScore >= 60 ? 'warn' as const : 'fail' as const;
  const duration = Math.round(performance.now() - startTime);

  // Output
  if (opts.format === 'json') {
    console.log(JSON.stringify({ files: files.length, teams, overallScore, overallStatus, duration }, null, 2));
    return;
  }

  // Table format
  for (const team of teams) {
    const blockTag = team.blocking ? colors.red(' [BLOCKING]') : '';
    printScore(`${team.name} (${team.findings})${blockTag}`, team.score);
  }

  printSection('종합');
  const statusIcon = overallStatus === 'pass' ? icons.pass : overallStatus === 'warn' ? icons.warn : icons.fail;
  const scoreColor = overallScore >= 80 ? colors.green : overallScore >= 60 ? colors.yellow : colors.red;
  console.log(`  ${statusIcon} ${scoreColor(`${overallScore}/100`)} | ${files.length}파일 | ${totalFindings}건 | ${duration}ms`);
  console.log(`  기준: ${threshold}점 | 상태: ${colors.bold(overallStatus.toUpperCase())}`);

  // Improvement hints for lowest scoring teams
  const worstTeams = [...teams].sort((a, b) => a.score - b.score).slice(0, 2);
  if (worstTeams.length > 0 && worstTeams[0].score < 80) {
    console.log('\n  💡 개선 포인트:');
    const hints: Record<string, string> = {
      simulation: 'cs explain 으로 루프/재귀 구조 확인',
      generation: 'cs fun challenge 로 빈 함수 채우기 연습',
      validation: '--mode strict 로 null 가드 자동 적용',
      'size-density': 'PART 구조로 파일 분리 추천',
      'asset-trace': 'cs search --symbols 로 미사용 코드 ���색',
      stability: 'try-catch 자동 추가: cs generate "에러 핸들링"',
      'release-ip': 'cs ip-scan 으로 상세 보안 검사',
      governance: 'cs audit 으로 아키텍처 전체 검진',
    };
    for (const t of worstTeams) {
      if (hints[t.name]) console.log(`     ${t.name}: ${hints[t.name]}`);
    }
  }

  // Session recording + Badge auto-trigger
  try {
    const { recordCommand, recordScore } = await import('../core/session');
    recordCommand(`verify ${path}`);
    recordScore('verify', overallScore);
  } catch { /* session not available */ }

  try {
    const { evaluateBadges } = await import('../core/badges');
    const { newBadges } = evaluateBadges();
    if (newBadges.length > 0) {
      console.log('');
      for (const b of newBadges) console.log(`  🏆 ${b.icon} ${b.name} 획득! — ${b.description}`);
    }
  } catch { /* badges optional */ }

  // Auto receipt
  try {
    const { computeReceiptHash, chainReceipt } = await import('../formatters/receipt');
    const { createHash } = await import('crypto');
    const { writeFileSync, mkdirSync } = await import('fs');
    const { join } = await import('path');

    const receiptDir = join(process.cwd(), '.cs', 'receipts');
    mkdirSync(receiptDir, { recursive: true });

    const receipt = {
      id: `cs-v-${Date.now().toString(36)}`,
      timestamp: Date.now(),
      codeHash: createHash('sha256').update(String(totalFindings)).digest('hex'),
      pipeline: {
        teams: teams.map(t => ({ name: t.name, score: t.score, blocking: t.blocking, findings: t.findings, passed: t.passed })),
        overallScore,
        overallStatus,
      },
      verification: { rounds: 0, fixesApplied: 0, stopReason: 'verify-only' },
      receiptHash: '',
    };
    receipt.receiptHash = computeReceiptHash(receipt);
    chainReceipt(receipt as unknown);
    writeFileSync(join(receiptDir, `${receipt.id}.json`), JSON.stringify(receipt, null, 2));
  } catch { /* receipt optional */ }

  if (overallStatus === 'fail') {
    process.exitCode = 1;
  }

  // Watch mode
  if (opts.watch) {
    const { watch } = await import('fs');
    console.log('\n  👀 워치 모드 — 파일 변경 감시 중 (Ctrl+C 종료)\n');
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let isRunning = false;
    watch(path, { recursive: true }, (_, filename) => {
      if (!filename || !SUPPORTED_EXTENSIONS.has(extname(filename))) return;
      if (isRunning) return; // Skip if already verifying
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        isRunning = true;
        console.log(`  [${new Date().toLocaleTimeString()}] ${filename} 변경 감지`);
        await runVerify(path, { ...opts, watch: false });
        isRunning = false;
      }, 500);
    });
  }
}

// IDENTITY_SEAL: PART-2 | role=pipeline-runner | inputs=path,opts | outputs=console
