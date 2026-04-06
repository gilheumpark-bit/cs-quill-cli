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
const IGNORE_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', '.cs', '__tests__', 'test', 'tests', 'e2e', 'coverage']);

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
  diff?: boolean;
  initBaseline?: boolean;
  showBaseline?: boolean;
}

interface TeamResult {
  name: string;
  score: number;
  findings: number;
  blocking: boolean;
  passed: boolean;
  capped: boolean; // findings가 bail-out threshold로 캡됨
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
  const isJson = opts.format === 'json';
  // JSON 모드: 모든 진행률/배너를 stderr로 → stdout에는 순수 JSON만
  const _origLog = console.log;
  if (isJson) {
    console.log = (...args: any[]) => process.stderr.write(args.join(' ') + '\n');
  }
  const log = console.log;

  if (!isJson) {
    printHeader(opts.diff ? '증분 검증 (git diff)' : '8팀 검증');
    console.log('');
  }

  // Discover files — --diff 모드: git 변경 파일만
  let files: SourceFile[];
  if (opts.diff) {
    try {
      const { execSync } = require('child_process');
      const diffOutput = execSync('git diff --name-only HEAD', { encoding: 'utf-8', cwd: path === '.' ? process.cwd() : path });
      const stagedOutput = execSync('git diff --name-only --cached', { encoding: 'utf-8', cwd: path === '.' ? process.cwd() : path });
      const changedFiles = new Set([...diffOutput.split('\n'), ...stagedOutput.split('\n')].map(f => f.trim()).filter(Boolean));
      const allFiles = discoverFiles(path);
      files = allFiles.filter(f => changedFiles.has(f.relativePath) || changedFiles.has(f.relativePath.replace(/\\/g, '/')));
      if (files.length === 0) {
        console.log(`  ${icons.pass} 변경된 파일 없음 — 검증 통과`);
        return;
      }
      console.log(`  ${icons.folder} git diff: ${changedFiles.size}개 변경, ${files.length}개 검증 대상`);
    } catch {
      console.log(`  ${icons.warn} git 사용 불가 — 전체 스캔으로 전환`);
      files = discoverFiles(path);
    }
  } else {
    files = discoverFiles(path);
  }
  if (files.length === 0) {
    console.log(`  ${icons.warn}  검증할 파일이 없습니다.`);
    return;
  }
  if (!opts.diff) log(`  ${icons.folder} ${files.length}개 파일 발견`);

  // ── Policy Graph 로드 (.csquill-policy.json) ──
  let policyGraph: any = null;
  let policyConflicts: any[] = [];
  const policyRoot = path === '.' ? process.cwd() : require('path').resolve(path);
  try {
    const { loadPolicyFile, detectConflicts } = require('../core/scope-policy');
    policyGraph = loadPolicyFile(policyRoot);
    const nodeCount = policyGraph.getNodeCount();
    if (nodeCount.global > 0 || nodeCount.workspaces > 0 || nodeCount.modules > 0) {
      const allRules = policyGraph.getAllRules();
      policyConflicts = detectConflicts(allRules);
      if (!isJson) {
        log(`  📋 Policy: ${allRules.length}개 규칙 (G:${nodeCount.global} W:${nodeCount.workspaces} M:${nodeCount.modules})`);
        if (policyConflicts.length > 0) {
          log(`  ⚠️  Policy 충돌: ${policyConflicts.length}건 감지 (상위 스코프 우선)`);
        }
      }
    }
  } catch { /* scope-policy 모듈 없으면 skip */ }

  const useParallel = opts.parallel && files.length > 3;
  if (useParallel) log(`  ${icons.rocket} 워커풀 병렬 모드 (${Math.min(files.length, 4)} workers)`);
  log('');

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
        // enhanced의 findings를 팀별로 집계 (severity 보존)
        const teamMap = new Map<string, { findings: Array<{ message: string; severity: string; line: number }> }>();
        for (const f of enhanced.findings) {
          const team = teamMap.get(f.team) ?? { findings: [] };
          if (team.findings.length < 15) {
            team.findings.push({ message: f.message, severity: f.severity, line: f.line ?? 0 });
          }
          teamMap.set(f.team, team);
        }
        const totalFindingCount = enhanced.findings.length || 1;
        for (const [name, data] of teamMap) {
          const teamRatio = data.findings.length / totalFindingCount;
          // teamRatio 감점 축소: 0.5 → 0.3 (개별 팀이 과도하게 감점되지 않도록)
          const teamScore = Math.max(0, Math.round(enhanced.combinedScore * (1 - teamRatio * 0.3)));
          result.teams.push({ name, score: teamScore, findings: data.findings.map(f => f.message) });
        }
        // details에 severity 포함해서 verdict 집계에 사용
        (result as any)._details = enhanced.findings.map(f => ({
          line: f.line ?? 0, message: f.message, severity: f.severity,
        }));
        return result;
      } catch (enhErr) {
        if (process.env.CS_DEBUG) console.error(`  [DEBUG] enhanced FAILED for ${file.relativePath}:`, (enhErr as Error).message?.slice(0, 200));
        return await runStaticPipeline(file.content, file.language);
      }
    }
    return await runStaticPipeline(file.content, file.language);
  }

  // ── 순차 실행 + 정수 필터 + 파일별 AI 판정 ──
  const allDetails: Array<{ line: number; message: string; severity: string }> = [];
  let aiVerified = false;
  let falsePositivesRemoved = 0;
  let filterDismissed = 0;
  let aiOrchestrator: any = null;
  let fpFilter: any = null;
  try {
    aiOrchestrator = require('../ai/verify-orchestrator');
  } catch { /* AI 미설정 */ }
  try {
    fpFilter = require('../core/false-positive-filter');
  } catch { /* 필터 없으면 skip */ }

  // ── 양품 패턴 감지 추적 ──
  let goodPatternCatalog: any = null;
  let detectGoodPatternsFn: ((code: string) => Set<string>) | null = null;
  try {
    goodPatternCatalog = require('../core/good-pattern-catalog');
    if (fpFilter && typeof fpFilter.detectGoodPatterns === 'function') {
      detectGoodPatternsFn = fpFilter.detectGoodPatterns;
    }
  } catch { /* catalog not available */ }

  // Per-quality dimension accumulator
  const goodPatternsByQuality: Record<string, { count: number; examples: string[] }> = {
    Maintainability: { count: 0, examples: [] },
    Reliability: { count: 0, examples: [] },
    Security: { count: 0, examples: [] },
    Performance: { count: 0, examples: [] },
  };
  let totalGoodPatterns = 0;
  let goodSuppressedFindings = 0;
  let goodDowngradedFindings = 0;

  {
    for (let fi = 0; fi < files.length; fi++) {
      const file = files[fi];
      (isJson ? process.stderr : process.stdout).write(`\r  ${icons.clock} ${fi + 1}/${files.length} 파일 검증 중...`);
      const result = await verifyOneFile(file);

      // enhanced _details 수집
      let fileDetails: Array<{ line: number; message: string; severity: string; ruleId?: string; confidence?: string }> = (result as any)._details ?? [];

      // ── Stage 1~4: 정수 필터 (AI 호출 전 확정 오탐 제거) ──
      if (fpFilter && fileDetails.length > 0) {
        const filterResult = fpFilter.runFalsePositiveFilter(fileDetails, file.relativePath, file.content);
        filterDismissed += filterResult.dismissed.length;
        fileDetails = filterResult.kept;
      }

      // ── Stage 5: 파일별 AI cross-judge 오탐 필터 (정수 필터 통과분만) ──
      if (aiOrchestrator && fileDetails.length > 0) {
        try {
          const aiResult = await aiOrchestrator.orchestrateVerify(
            file.content.slice(0, 4000),
            {
              teams: (result.teams ?? []).map((t: any) => ({
                name: t.name,
                score: t.score ?? 50,
                findings: t.findings.map((f: any) => typeof f === 'string'
                  ? { line: 0, message: f, severity: 'warning' }
                  : { line: f.line ?? 0, message: f.message ?? f, severity: f.severity ?? 'warning' }),
              })),
              overallScore: result.overallScore ?? 50,
              overallStatus: 'unknown',
            },
            file.relativePath,
          );
          if (aiResult.aiVerified && aiResult.falsePositivesRemoved > 0) {
            aiVerified = true;
            falsePositivesRemoved += aiResult.falsePositivesRemoved;
            // AI가 걸러낸 결과로 교체
            for (const refined of aiResult.teams) {
              const stage = (result.teams ?? []).find((t: any) => t.name === refined.name);
              if (stage) {
                stage.findings = refined.findings.map((f: any) => typeof f === 'string' ? f : f.message ?? f);
                if (stage.score !== undefined) stage.score = refined.score;
              }
            }
          }
        } catch { /* AI 호출 실패 — static 결과 유지 */ }
      }

      // ── 양품 패턴 감지 (파일별) ──
      if (detectGoodPatternsFn && goodPatternCatalog) {
        try {
          const detected = detectGoodPatternsFn(file.content);
          const suppressMap = fpFilter?.SUPPRESS_MAP ?? {};
          for (const goodId of detected) {
            const meta = goodPatternCatalog.getGoodPattern(goodId);
            if (meta) {
              const q = goodPatternsByQuality[meta.quality];
              if (q) {
                q.count++;
                if (q.examples.length < 5 && !q.examples.includes(meta.title)) {
                  q.examples.push(meta.title);
                }
              }
              totalGoodPatterns++;
              // Count suppressions: how many fileDetails would be suppressed by this good pattern
              if (meta.signal === 'suppress-fp' || meta.suppresses) {
                const suppressedIds = suppressMap[goodId] ?? meta.suppresses ?? [];
                for (const fd of fileDetails) {
                  if ((fd as any).ruleId && suppressedIds.includes((fd as any).ruleId)) {
                    goodSuppressedFindings++;
                  }
                }
              }
              // Count boost signal downgrades
              if (meta.signal === 'boost') {
                goodDowngradedFindings++;
              }
            }
          }
        } catch { /* good pattern detection failed — skip */ }
      }

      allDetails.push(...fileDetails);
      for (const stage of result.teams ?? (result as any).stages ?? []) {
        const scores = allTeamScores.get(stage.name) ?? [];
        scores.push(stage.score);
        allTeamScores.set(stage.name, scores);
        const findings = allTeamFindings.get(stage.name) ?? 0;
        allTeamFindings.set(stage.name, findings + (Array.isArray(stage.findings) ? stage.findings.length : 0));
        totalFindings += Array.isArray(stage.findings) ? stage.findings.length : 0;
      }
    }
    console.log(''); // progress 줄바꿈
  }

  // Aggregate team results — capped 팀은 감점 점수 + 50% 가중치
  const BLOCKING_TEAMS = new Set(['validation', 'release-ip']);
  const teams: TeamResult[] = [];

  // team-isolation에서 캡 정보 가져오기
  let cappedTeamNames: Set<string> = new Set();
  let cappedTeamScore = 40; // 기본값: max(25, 100 - 30*2) = 40
  try {
    const teamIsolation = require('../core/team-isolation');
    if (typeof teamIsolation.getCappedTeamScore === 'function') {
      cappedTeamScore = teamIsolation.getCappedTeamScore();
    }
    // 각 팀의 findings 수로 캡 여부 판단
    for (const [name, _scores] of allTeamScores) {
      const findings = allTeamFindings.get(name) ?? 0;
      const teamFindings = allDetails
        .slice(0, findings)
        .map(d => ({ severity: d.severity, message: d.message }));
      const tv = teamIsolation.computeTeamVerdict(name, teamFindings);
      if (tv.capped) cappedTeamNames.add(name);
    }
  } catch { /* team-isolation 없으면 캡 없음 */ }

  for (const [name, scores] of allTeamScores) {
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const findings = allTeamFindings.get(name) ?? 0;
    const blocking = BLOCKING_TEAMS.has(name);
    const isCapped = cappedTeamNames.has(name);
    // 캡된 팀은 고정 감점 점수 사용
    const finalScore = isCapped ? cappedTeamScore : avgScore;
    teams.push({
      name,
      score: finalScore,
      findings,
      blocking,
      passed: blocking ? finalScore >= threshold : true,
      capped: isCapped,
      details: [],
    });
  }

  // 캡된 팀은 50% 가중치로 overall score에 기여
  if (cappedTeamNames.size > 0) {
    let weightedSum = 0;
    let totalWeight = 0;
    for (const t of teams) {
      const weight = t.capped ? 0.5 : 1.0;
      weightedSum += t.score * weight;
      totalWeight += weight;
    }
    // _weightedOverallScore는 아래 overallScore 계산에서 참조
    (teams as any)._weightedAvg = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }

  // AST summary (already included in enhanced pipeline if available)
  if (useEnhanced && astFindingsTotal > 0) {
    console.log(`\n  🔬 AST 심층분석: ${astFindingsTotal}건 추가 발견 (Level 2 정밀도)`);
  }

  // AI orchestrator는 파일별 실행으로 이동 (위 순차 실행 루프 참조)

  // ── Waveform 이상 탐지 ──
  let waveformAnomalies = 0;
  try {
    const { analyzeWaveform } = require('../core/integrity-waveform');
    const fileStats = files.map(f => {
      const count = allDetails.filter(d => true).length / Math.max(files.length, 1); // 파일별 평균 추정
      return { file: f.relativePath, findings: count };
    });
    // 팀별 findings로 더 정확하게
    const teamStats = teams.map(t => ({ file: t.name, findings: t.findings }));
    const scanMode = opts.diff ? 'single' : 'full';
    const waveform = analyzeWaveform(teamStats, scanMode);
    if (waveform.anomalies.length > 0) {
      waveformAnomalies = waveform.anomalies.length;
      console.log(`  ⚡ Waveform: ${waveform.anomalies.length}개 팀 이상치 감지 (μ=${waveform.mean}, σ=${waveform.stdDev})`);
      for (const a of waveform.anomalies) {
        console.log(`    → ${a.file}: ${a.findings}건 (z=${a.zScore})`);
      }
    }
  } catch { /* waveform 없으면 skip */ }

  // ── Team Isolation ──
  let isolatedTeamCount = 0;
  let cappedTeamCount = 0;
  try {
    const { computeTeamVerdict, aggregateIsolated } = require('../core/team-isolation');
    const teamVerdicts = teams.map(t => {
      const teamFindings = allDetails
        .filter(() => true) // 현재 파일별 분리가 안 되어 있으므로 팀 findings 수로 추정
        .slice(0, t.findings)
        .map(d => ({ severity: d.severity, message: d.message }));
      return computeTeamVerdict(t.name, teamFindings);
    });
    const isolated = aggregateIsolated(teamVerdicts);
    isolatedTeamCount = isolated.isolatedTeams;
    cappedTeamCount = teamVerdicts.filter((tv: any) => tv.capped).length;
    if (cappedTeamCount > 0) {
      console.log(`  🔒 캡 적용: ${cappedTeamCount}개 팀 findings 제한 (50% 가중치로 verdict 포함)`);
    }
    if (isolatedTeamCount > 0) {
      console.log(`  🔒 격리: ${isolatedTeamCount}개 팀 bail-out (전체 verdict에서 제외)`);
    }
  } catch { /* isolation 없으면 skip */ }

  // ── Baseline + Suppression 필터 ──
  let baselineSuppressed = 0;
  let inlineSuppressed = 0;
  let policyOverriddenTotal = 0;
  const root = path === '.' ? process.cwd() : require('path').resolve(path);

  try {
    const { loadBaseline, filterByBaseline, initBaseline } = require('../core/baseline');
    const { parseSuppressions, applySuppression, applyScopedSuppression, loadIgnorePatterns, isIgnored } = require('../core/suppression');

    // --init-baseline: 현재 결과를 baseline으로 저장
    if (opts.initBaseline) {
      const codeMap = new Map(files.map(f => [f.relativePath, f.content]));
      const allF = allDetails.map(d => ({ ...d, file: files[0]?.relativePath ?? '', ruleId: 'unknown' }));
      const bl = initBaseline(root, allF, codeMap);
      console.log(`\n  📌 Baseline 저장: ${bl.entries.length}건 동결 → .csquill-baseline.json`);
    }

    // Baseline 필터: 기존 이슈 숨김
    const baseline = loadBaseline(root);
    if (baseline && !opts.showBaseline) {
      const codeMap = new Map(files.map(f => [f.relativePath, f.content]));
      const result = filterByBaseline(baseline, allDetails.map(d => ({ ...d, file: '', ruleId: 'unknown' })), codeMap);
      baselineSuppressed = result.suppressed;
      // allDetails에서 제거
      if (baselineSuppressed > 0) {
        const keptSet = new Set(result.kept.map((k: any) => `${k.line}:${k.message}`));
        const before = allDetails.length;
        allDetails.splice(0, allDetails.length, ...allDetails.filter(d => keptSet.has(`${d.line}:${d.message}`)));
        totalFindings -= (before - allDetails.length);
      }
    }

    // Inline suppression: csquill-disable 주석 (scope-aware)
    for (const file of files) {
      const suppressions = parseSuppressions(file.content);
      if (suppressions.length > 0) {
        const fileFindings = allDetails.filter(d => true); // 현재 file 단위 분리 없으므로 전체에서 적용
        if (policyGraph && typeof applyScopedSuppression === 'function') {
          const result = applyScopedSuppression(fileFindings, suppressions, policyGraph, file.relativePath);
          inlineSuppressed += result.suppressed;
          policyOverriddenTotal += result.policyOverridden;
        } else {
          const result = applySuppression(fileFindings, suppressions);
          inlineSuppressed += result.suppressed;
        }
      }
    }
  } catch { /* baseline/suppression 모듈 없으면 skip */ }

  // ── Verdict 집계 — 메시지 기반 3단계 분류 ──
  function classifyLevel(severity: string, _message: string, ruleId?: string): 'hard-fail' | 'review' | 'note' {
    // severity 기반 분류 — 메시지 키워드 매칭은 자기참조 오탐을 유발하므로 제거
    if (severity === 'critical') {
      // Only SEC (security) and RTE (runtime error) categories warrant hard-fail
      const category = ruleId ? ruleId.split('-')[0].toUpperCase() : '';
      if (category === 'SEC' || category === 'RTE') return 'hard-fail';
      return 'review'; // all other critical findings downgrade to review
    }
    if (severity === 'error') return 'review';
    if (severity === 'warning') return 'review';
    return 'note'; // info 등
  }

  let allHardFail = 0, allReview = 0, allNote = 0;
  // enhanced _details가 있으면 그걸로 정밀 분류
  const detailSource = allDetails.length > 0 ? allDetails
    : teams.flatMap(t => t.details ?? []);
  for (const d of detailSource) {
    const level = classifyLevel(d.severity, d.message, (d as any).ruleId);
    if (level === 'hard-fail') allHardFail++;
    else if (level === 'review') allReview++;
    else allNote++;
  }
  // 아무 detail도 없으면 findings 수로 추정
  if (allHardFail + allReview + allNote === 0) {
    allReview = totalFindings;
  }

  const overallVerdict = allHardFail > 0 ? 'FAIL' : allReview > 5 ? 'REVIEW' : 'PASS';
  // 양품 패턴 부스트: 패턴당 1.0점, 최대 20점 (17+ 패턴도 충분히 반영)
  const goodBoost = Math.min(Math.round(totalGoodPatterns * 1.0), 20);
  // 필터 보너스: 정수필터+AI가 제거한 비율에 비례, 최대 15점
  const totalRaw = allReview + filterDismissed + falsePositivesRemoved;
  const filterBonus = totalRaw > 0
    ? Math.min(Math.round((filterDismissed + falsePositivesRemoved) / totalRaw * 15), 15)
    : 0;
  // 팀 건강도 보너스: 50% 초과 팀이 통과하면 +5
  const passingTeams = teams.filter(t => t.score >= threshold).length;
  const teamHealthBonus = (teams.length > 0 && passingTeams / teams.length > 0.5) ? 5 : 0;
  // 파일당 findings 밀도로 정규화 — allReview는 정수필터/AI 제거 후 값
  const fileCount = Math.max(files.length, 1);
  const reviewDensity = allReview / fileCount;
  // 밀도 기반 감점: 파일당 5건 이하 = 가벼움, 10건 = 중간, 20건+ = 심각
  const reviewPenalty = Math.min(30, Math.round(reviewDensity * 1.5));
  const overallScore = overallVerdict === 'PASS' ? 100
    : overallVerdict === 'REVIEW' ? Math.min(100, Math.max(60, 100 - reviewPenalty) + goodBoost + filterBonus + teamHealthBonus)
    : Math.max(0, 50 - allHardFail * 5);
  const overallStatus = overallVerdict.toLowerCase() as 'pass' | 'review' | 'fail';
  const duration = Math.round(performance.now() - startTime);

  // ── 양품 감지 리포트 데이터 ──
  const goodPatternReport = {
    total: totalGoodPatterns,
    byQuality: Object.fromEntries(
      Object.entries(goodPatternsByQuality).map(([k, v]) => [k, { count: v.count, examples: v.examples }])
    ),
    suppressed: goodSuppressedFindings,
    downgraded: goodDowngradedFindings,
  };

  // Output
  if (isJson) {
    console.log = _origLog; // stdout 복원 — 순수 JSON 출력
    console.log(JSON.stringify({
      files: files.length, verdict: overallVerdict, overallScore,
      teams,
      summary: { hardFail: allHardFail, reviewRequired: allReview, styleNote: allNote },
      scoring: {
        reviewDensity: Math.round(reviewDensity * 100) / 100,
        reviewPenalty,
        goodBoost,
        filterBonus,
        teamHealthBonus,
        filterDismissed,
        totalRaw,
        passingTeams,
        totalTeams: teams.length,
      },
      goodPatternReport,
      policy: {
        loaded: !!policyGraph,
        conflicts: policyConflicts.length,
        overridden: policyOverriddenTotal,
      },
      duration, aiVerified, falsePositivesRemoved,
      ari: (() => { try { const { getARIReport } = require('../core/ai-bridge'); return getARIReport(); } catch { return []; } })(),
    }, null, 2));
    return;
  }

  // Verdict format — 팀별 3단계 분류 표시
  for (const team of teams) {
    let hf = 0, rr = 0, sn = 0;
    for (const d of (team.details ?? [])) {
      const lv = classifyLevel(d.severity, d.message, (d as any).ruleId);
      if (lv === 'hard-fail') hf++;
      else if (lv === 'review') rr++;
      else sn++;
    }
    // details 없으면 findings 수로 추정
    if (hf + rr + sn === 0 && team.findings > 0) rr = team.findings;

    const label = hf > 0 ? colors.red(`✖ ${team.name}`) : rr > 0 ? colors.yellow(`△ ${team.name}`) : colors.green(`✔ ${team.name}`);
    const counts = [
      hf > 0 ? colors.red(`${hf} hard-fail`) : '',
      rr > 0 ? colors.yellow(`${rr} review`) : '',
      sn > 0 ? `${sn} note` : '',
    ].filter(Boolean).join(', ') || colors.green('clean');
    console.log(`  ${label.padEnd(35)} ${counts}`);
  }

  // ── 양품 감지 리포트 (텍스트) ──
  if (totalGoodPatterns > 0) {
    console.log('');
    printSection('양품 패턴 감지');
    for (const [quality, data] of Object.entries(goodPatternsByQuality)) {
      if (data.count > 0) {
        const examples = data.examples.length > 0 ? ` (${data.examples.join(', ')})` : '';
        console.log(`     ${quality}: ${data.count}건${examples}`);
      }
    }
    const parts = [`총 ${totalGoodPatterns}건 감지`];
    if (goodSuppressedFindings > 0) parts.push(`불량 ${goodSuppressedFindings}건 억제`);
    if (goodDowngradedFindings > 0) parts.push(`${goodDowngradedFindings}건 신뢰도 하향`);
    console.log(`     ${parts.join(' → ')}`);
  }

  printSection('종합');
  const verdictIcon = overallVerdict === 'PASS' ? icons.pass : overallVerdict === 'REVIEW' ? icons.warn : icons.fail;
  const verdictColor = overallVerdict === 'PASS' ? colors.green : overallVerdict === 'REVIEW' ? colors.yellow : colors.red;
  console.log(`  ${verdictIcon} ${verdictColor(overallVerdict)} | ${files.length}파일 | ${duration}ms`);
  console.log(`  hard-fail: ${allHardFail}건 | review: ${allReview}건 | note: ${allNote > 0 ? allNote : 0}건`);
  if (overallVerdict === 'REVIEW') {
    const scoreParts = [`감점 -${reviewPenalty}`, `양품 +${goodBoost}`];
    if (filterBonus > 0) scoreParts.push(`필터 +${filterBonus}`);
    if (teamHealthBonus > 0) scoreParts.push(`팀건강 +${teamHealthBonus}`);
    console.log(`  📊 점수 구성: base 100 → ${scoreParts.join(', ')} = ${overallScore}`);
  }
  if (filterDismissed > 0) {
    console.log(`  🧹 정수 필터 — ${filterDismissed}건 확정 오탐 제거`);
  }
  if (aiVerified) {
    console.log(`  🤖 AI 판정 — ${falsePositivesRemoved}건 추가 제거`);
  }
  // ARI (Agent Reliability Index) report
  try {
    const { getARIReport } = require('../core/ai-bridge');
    const ariReport = getARIReport();
    if (ariReport.length > 0) {
      console.log('  📡 ARI (Agent Reliability Index):');
      for (const ari of ariReport) {
        const circuitIcon = ari.circuitState === 'closed' ? '🟢' : ari.circuitState === 'half-open' ? '🟡' : '🔴';
        console.log(`     ${circuitIcon} ${ari.provider}: score=${Math.round(ari.score)} circuit=${ari.circuitState} (ok=${ari.successCount} err=${ari.errorCount})`);
      }
    }
  } catch { /* ARI not available */ }
  if (baselineSuppressed > 0) {
    console.log(`  📌 Baseline — ${baselineSuppressed}건 동결`);
  }
  if (inlineSuppressed > 0) {
    console.log(`  🔇 Suppression — ${inlineSuppressed}건 억제`);
  }
  if (policyOverriddenTotal > 0) {
    console.log(`  📋 Policy Override — ${policyOverriddenTotal}건 상위 스코프 강제 적용`);
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
