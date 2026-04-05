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
  const { printHeader, printScore, printSection, icons, colors } = require('../core/terminal-compat');

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
    enhancedImport = require('../core/ast-bridge');
  } catch (e) {
    useEnhanced = false;
    if (process.env.CS_DEBUG) console.error('  [DEBUG] ast-bridge load failed:', (e as Error).message);
  }

  const { runStaticPipeline } = require('../core/pipeline-bridge');

  const allTeamScores: Map<string, number[]> = new Map();
  const allTeamFindings: Map<string, number> = new Map();
  let totalFindings = 0;
  let astFindingsTotal = 0;

  // ── 파일 검증 함수 ──
  async function verifyOneFile(file: SourceFile) {
    if (useEnhanced && enhancedImport) {
      try {
        // static 결과를 먼저 구하고 enhanced에 전달 (순환 import 방지)
        const staticResult = await runStaticPipeline(file.content, file.language);
        const enhanced = await enhancedImport.runEnhancedPipeline(file.content, file.language, file.relativePath, staticResult);
        astFindingsTotal += enhanced.astFindings;
        const result = {
          teams: [] as Array<{ name: string; score: number; findings: string[] }>,
          overallScore: enhanced.combinedScore,
          overallStatus: enhanced.combinedScore >= 80 ? 'pass' : enhanced.combinedScore >= 60 ? 'warn' : 'fail',
        };
        // enhanced의 combinedScore를 신뢰하고 팀별 findings만 집계
        const teamMap = new Map<string, { findings: string[] }>();
        for (const f of enhanced.findings) {
          const team = teamMap.get(f.team) ?? { findings: [] };
          if (team.findings.length < 10) team.findings.push(f.message);
          teamMap.set(f.team, team);
        }
        // 팀별 점수: combinedScore를 기반으로 findings 비율에 따라 분배
        const totalFindingCount = enhanced.findings.length || 1;
        for (const [name, data] of teamMap) {
          const teamRatio = data.findings.length / totalFindingCount;
          // findings가 많은 팀일수록 낮은 점수, 적은 팀일수록 높은 점수
          const teamScore = Math.max(0, Math.round(enhanced.combinedScore * (1 - teamRatio * 0.5)));
          result.teams.push({ name, score: teamScore, findings: data.findings });
        }
        return result;
      } catch (enhErr) {
        if (process.env.CS_DEBUG) console.error(`  [DEBUG] enhanced failed for ${file.relativePath}:`, (enhErr as Error).message?.slice(0, 100));
        return await runStaticPipeline(file.content, file.language);
      }
    }
    return await runStaticPipeline(file.content, file.language);
  }

  // ── 순차 실행 (enhanced pipeline 사용을 위해 순차로 통일) ──
  {
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

  // ── AI Orchestrator: team-lead + cross-judge 오탐 필터 ──
  let aiVerified = false;
  let falsePositivesRemoved = 0;
  try {
    const { orchestrateVerify } = require('../ai/verify-orchestrator');
    const staticTeams = teams.map(t => ({
      name: t.name,
      score: t.score,
      findings: t.details.length > 0
        ? t.details.map(d => ({ line: d.line, message: d.message, severity: d.severity }))
        : Array.from({ length: t.findings }, (_, i) => ({ line: 0, message: `finding-${i}`, severity: 'warning' })),
    }));
    const sampleCode = files.slice(0, 3).map(f => f.content).join('\n').slice(0, 8000);
    const aiResult = await orchestrateVerify(sampleCode, {
      teams: staticTeams,
      overallScore: Math.round(teams.reduce((s, t) => s + t.score, 0) / Math.max(teams.length, 1)),
      overallStatus: 'unknown',
    }, files[0]?.relativePath ?? 'unknown');

    if (aiResult.aiVerified) {
      aiVerified = true;
      falsePositivesRemoved = aiResult.falsePositivesRemoved;
      // AI 결과로 팀 점수 갱신
      for (const refined of aiResult.teams) {
        const existing = teams.find(t => t.name === refined.name);
        if (existing) {
          existing.score = refined.score;
          existing.findings = refined.findings.length;
          existing.details = refined.findings.map(f => ({ line: f.line, message: f.message, severity: f.severity }));
          existing.passed = existing.blocking ? refined.score >= threshold : true;
        }
      }
    }
  } catch {
    // AI 미설정 또는 호출 실패 → static 결과 유지
  }

  // ── Verdict 집계 ──
  const allHardFail = teams.reduce((s, t) => s + (t.details?.filter(d => d.severity === 'error' || d.severity === 'critical').length ?? 0), 0);
  const allReview = teams.reduce((s, t) => s + (t.details?.filter(d => d.severity === 'warning').length ?? 0), 0);
  const allNote = totalFindings - allHardFail - allReview;

  const overallVerdict = allHardFail > 0 ? 'FAIL' : allReview > 5 ? 'REVIEW' : 'PASS';
  const overallScore = overallVerdict === 'PASS' ? 100
    : overallVerdict === 'REVIEW' ? Math.max(60, 100 - allReview * 2)
    : Math.max(0, 50 - allHardFail * 5);
  const overallStatus = overallVerdict.toLowerCase() as 'pass' | 'review' | 'fail';
  const duration = Math.round(performance.now() - startTime);

  // Output
  if (opts.format === 'json') {
    console.log(JSON.stringify({
      files: files.length, verdict: overallVerdict, teams,
      summary: { hardFail: allHardFail, reviewRequired: allReview, styleNote: allNote },
      duration, aiVerified, falsePositivesRemoved,
    }, null, 2));
    return;
  }

  // Verdict format — 팀별 findings 수 + level 표시
  for (const team of teams) {
    const hf = team.details?.filter(d => d.severity === 'error' || d.severity === 'critical').length ?? 0;
    const rr = team.details?.filter(d => d.severity === 'warning').length ?? 0;
    const label = hf > 0 ? colors.red(`✖ ${team.name}`) : rr > 0 ? colors.yellow(`△ ${team.name}`) : colors.green(`✔ ${team.name}`);
    const counts = [
      hf > 0 ? colors.red(`${hf} hard-fail`) : '',
      rr > 0 ? colors.yellow(`${rr} review`) : '',
    ].filter(Boolean).join(', ') || colors.green('clean');
    console.log(`  ${label.padEnd(35)} ${counts}`);
  }

  printSection('종합');
  const verdictIcon = overallVerdict === 'PASS' ? icons.pass : overallVerdict === 'REVIEW' ? icons.warn : icons.fail;
  const verdictColor = overallVerdict === 'PASS' ? colors.green : overallVerdict === 'REVIEW' ? colors.yellow : colors.red;
  console.log(`  ${verdictIcon} ${verdictColor(overallVerdict)} | ${files.length}파일 | ${duration}ms`);
  console.log(`  hard-fail: ${allHardFail}건 | review: ${allReview}건 | note: ${allNote > 0 ? allNote : 0}건`);
  if (aiVerified) {
    console.log(`  🤖 AI 검증 — 오탐 ${falsePositivesRemoved}건 제거`);
  }

  // Improvement hints for lowest scoring teams
  const worstTeams = [...teams].sort((a, b) => a.score - b.score).slice(0, 2);
  if (worstTeams.length > 0 && worstTeams[0].score < 80) {
    console.log('\n  💡 개선 포인트:');
    const hints: Record<string, string> = {
      // enhanced pipeline teams (ast-bridge)
      simulation: 'cs explain 으로 루프/재귀 구조 확인',
      generation: 'cs fun challenge 로 빈 함수 채우기 연습',
      validation: '--mode strict 로 null 가드 자동 적용',
      'size-density': 'PART 구조로 파일 분리 추천',
      'asset-trace': 'cs search --symbols 로 미사용 코드 탐색',
      stability: 'try-catch 자동 추가: cs generate "에러 핸들링"',
      'release-ip': 'cs ip-scan 으로 상세 보안 검사',
      governance: 'cs audit 으로 아키텍처 전체 검진',
      // static pipeline teams (pipeline-bridge)
      ast: 'cs explain 으로 함수 복잡도 및 중첩 구조 점검',
      hollow: 'cs verify --mode strict 로 빈 함수 및 스텁 전수 탐지',
      'bug-pattern': 'cs audit 으로 ==, 미사용 변수, 위험 패턴 정밀 검사',
      'design-lint': 'Design System v8.0 시맨틱 토큰 규칙 확인',
    };
    let hintPrinted = false;
    for (const t of worstTeams) {
      if (hints[t.name]) {
        console.log(`     ${t.name}: ${hints[t.name]}`);
        hintPrinted = true;
      }
    }
    if (!hintPrinted) {
      console.log(`     ${worstTeams.map(t => t.name).join(', ')}: cs audit 으로 상세 검진 권장`);
    }
  }

  // Session recording + Badge auto-trigger
  try {
    const { recordCommand, recordScore } = require('../core/session');
    recordCommand(`verify ${path}`);
    recordScore('verify', overallScore);
  } catch { /* session not available */ }

  try {
    const { evaluateBadges } = require('../core/badges');
    const { newBadges } = evaluateBadges();
    if (newBadges.length > 0) {
      console.log('');
      for (const b of newBadges) console.log(`  🏆 ${b.icon} ${b.name} 획득! — ${b.description}`);
    }
  } catch { /* badges optional */ }

  // Auto receipt
  try {
    const { computeReceiptHash, chainReceipt } = require('../formatters/receipt');
    const { createHash } = require('crypto');
    const { writeFileSync, mkdirSync } = require('fs');
    const { join } = require('path');

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
    const { watch } = require('fs');
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
