// ============================================================
// CS Quill 🦔 — Pipeline Bridge
// ============================================================
// @/lib/code-studio/pipeline/* 대신 CLI 자체 검증 파이프라인.
// 기존 8팀 파이프라인을 CLI 어댑터로 재구성.

// ============================================================
// PART 1 — Static Pipeline (8팀 통합)
// ============================================================

export type FindingLevel = 'hard-fail' | 'review-required' | 'style-note';

export interface Finding {
  ruleId: string;
  line: number;
  level: FindingLevel;
  confidence: 'high' | 'medium' | 'low';
  message: string;
}

/** 팀 레이어 내부 finding — severity로 점수 계산 후 verdict Finding으로 변환 */
export interface TeamRawFinding {
  line: number;
  message: string;
  severity?: 'error' | 'warning' | 'info' | 'critical';
  ruleId?: string;
  confidence?: string;
  [key: string]: unknown;
}

export interface TeamPipelineChunk {
  name: string;
  score: number;
  findings: TeamRawFinding[];
}

export interface PipelineResult {
  verdict: 'pass' | 'review' | 'fail';
  teams: Array<{
    name: string;
    score: number;
    findings: Finding[];
  }>;
  summary: {
    hardFail: number;
    reviewRequired: number;
    styleNote: number;
  };
  // 하위 호환: 기존 코드가 score를 참조하는 곳 대비
  score: number;
}

// ── 팀별 정수 필터 헬퍼 ──
function filterTeamFindings(
  teamResult: { name: string; score: number; findings: any[] },
  code: string,
  filePath: string = 'analysis.ts',
): typeof teamResult {
  try {
    const { runFalsePositiveFilter } = require('./false-positive-filter');
    const mapped = teamResult.findings.map((f: any) => ({
      ruleId: f.ruleId ?? `${teamResult.name}/unknown`,
      line: f.line ?? 0,
      message: f.message ?? String(f),
      severity: f.severity ?? 'warning',
      confidence: f.confidence ?? 'medium',
    }));
    const result = runFalsePositiveFilter(mapped, filePath, code);
    const kept = result.kept;
    // 점수 재계산 (필터 후 findings 기준)
    const errors = kept.filter((f: any) => f.severity === 'error' || f.severity === 'critical').length;
    const warnings = kept.filter((f: any) => f.severity === 'warning').length;
    const score = Math.max(0, 100 - errors * 10 - warnings * 2);
    return { name: teamResult.name, score, findings: kept };
  } catch {
    return teamResult; // 필터 없으면 원본
  }
}

export async function runStaticPipeline(code: string, language: string): Promise<PipelineResult> {
  const teams: TeamPipelineChunk[] = [];

  // Team 1: Regex (표면 패턴 — 항상 실행, 1차 필터)
  teams.push(filterTeamFindings(runRegexTeam(code, language), code));

  // Team 2: AST (4계층 엔진 — createProgram + TypeChecker + esquery)
  try {
    const { runQuillEngine } = require('./quill-engine');
    const engineResult = runQuillEngine(code, 'analysis.ts');

    const allFindings = engineResult.findings.map((f: any) => ({
      line: f.line ?? 0,
      message: f.message,
      severity: f.severity === 'critical' ? 'error' as const : f.severity as 'error' | 'warning' | 'info',
      ruleId: f.ruleId,
      confidence: f.confidence,
      evidence: f.evidence,
    }));

    // evidence 기반 confidence: multi-engine이면 승격 표시
    const multiEngine = engineResult.enginesUsed.length > 1;
    if (multiEngine) {
      // 첫 번째 finding에 엔진 정보 추가
      if (allFindings.length > 0) {
        (allFindings[0] as any)._engines = engineResult.enginesUsed.join('+');
      }
    }

    // 이하 기존 코드와 호환
    const seen = new Set<string>();
    const dedupedFindings = allFindings.filter((f: any) => {
      const key = `${f.line}:${f.message}`;
      if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    const capped = dedupedFindings.slice(0, 20);
    const score = Math.max(0, 100 - capped.filter((f: any) => f.severity === 'error').length * 10 - capped.filter((f: any) => f.severity === 'warning').length * 2);
    teams.push(filterTeamFindings({ name: 'ast', score, findings: capped }, code));
  } catch {
    teams.push(filterTeamFindings(runASTFallback(code, language), code));
  }

  // Team 3: Hollow
  teams.push(filterTeamFindings(runHollowCheck(code), code));

  // Team 4: Dead Code
  teams.push(filterTeamFindings(runDeadCodeCheck(code), code));

  // Team 5: Design Lint
  try {
    const { checkPrettier } = require('../adapters/lint-engine');
    const prettierResult = await checkPrettier(code, 'analysis.ts');
    const designFindings = runDesignLintCheck(code).findings;
    const score = prettierResult.isFormatted ? Math.max(70, 100 - designFindings.length * 10) : Math.max(0, 60 - designFindings.length * 10);
    teams.push(filterTeamFindings({ name: 'design-lint', score, findings: [
      ...designFindings,
      ...(prettierResult.isFormatted ? [] : [{ line: 0, message: 'Prettier 포맷 불일치', severity: 'warning' as const }]),
    ]}, code));
  } catch {
    teams.push(filterTeamFindings(runDesignLintCheck(code), code));
  }

  // Team 6: Cognitive Load
  teams.push(filterTeamFindings(runCognitiveLoadCheck(code), code));

  // Team 7: Bug Pattern
  try {
    const { runDeepVerify } = require('./deep-verify');
    const deepResult = await runDeepVerify(code, 'analysis.ts');
    const findings = deepResult.findings.map((f: { message: string; line?: number; severity?: string }) => ({
      line: f.line ?? 0, message: f.message,
      severity: (f.severity === 'P0' ? 'error' : 'warning') as 'error' | 'warning',
    }));
    const score = Math.max(0, 100 - findings.filter(f => f.severity === 'error').length * 10 - findings.filter(f => f.severity === 'warning').length * 2);
    teams.push(filterTeamFindings({ name: 'bug-pattern', score, findings: findings.slice(0, 20) }, code));
  } catch {
    teams.push(filterTeamFindings(runBugPatternCheck(code, language), code));
  }

  // Team 8: Security Pattern
  teams.push(filterTeamFindings(runSecurityPatternCheck(code, language), code));

  // ── Verdict 변환: score 기반 → level 기반 ──
  const verdictTeams: PipelineResult['teams'] = teams.map((t: TeamPipelineChunk) => ({
    name: t.name,
    score: t.score,
    findings: t.findings.slice(0, 15).map((f: TeamRawFinding) => ({
      ruleId: `${t.name}/${(f.message || '').slice(0, 30).replace(/\s+/g, '-').toLowerCase()}`,
      line: f.line ?? 0,
      level: mapToLevel(f.severity ?? 'warning', f.message ?? ''),
      confidence: mapToConfidence(f.severity ?? 'warning', f.message ?? ''),
      message: f.message ?? String(f),
    })),
  }));

  const allFindings = verdictTeams.flatMap(t => t.findings);
  const hardFail = allFindings.filter(f => f.level === 'hard-fail').length;
  const reviewRequired = allFindings.filter(f => f.level === 'review-required').length;
  const styleNote = allFindings.filter(f => f.level === 'style-note').length;

  const verdict: PipelineResult['verdict'] = hardFail > 0 ? 'fail' : reviewRequired > 0 ? 'review' : 'pass';

  // 하위 호환 score — 로그 스케일 감점 (대량 findings에도 점수 바닥 방지)
  const reviewPenaltyPB = Math.min(35, Math.round(Math.log2(reviewRequired + 1) * 5));
  const avgScore = verdict === 'pass' ? 100
    : verdict === 'review' ? Math.max(60, 100 - reviewPenaltyPB)
    : Math.max(0, 50 - hardFail * 10);

  return {
    verdict,
    score: avgScore,
    teams: verdictTeams,
    summary: { hardFail, reviewRequired, styleNote },
  };
}

// ── Level/Confidence 변환 헬퍼 — severity 기반 (메시지 키워드 매칭은 자기참조 오탐 유발) ──
function mapToLevel(severity: string, _message: string): FindingLevel {
  if (severity === 'critical') return 'hard-fail';
  if (severity === 'error') return 'review-required';
  if (severity === 'warning') return 'review-required';
  return 'style-note'; // info 등
}

function mapToConfidence(severity: string, _message: string): 'high' | 'medium' | 'low' {
  if (severity === 'critical') return 'high';
  if (severity === 'error') return 'high';
  if (severity === 'warning') return 'medium';
  return 'low';
}

// IDENTITY_SEAL: PART-1 | role=pipeline | inputs=code,language | outputs=PipelineResult

// ============================================================
// PART 2 — Team Implementations
// ============================================================

function runRegexTeam(code: string, _language: string): TeamPipelineChunk {
  const findings: TeamRawFinding[] = [];
  const lines = code.split('\n');

  const patterns: Array<{ regex: RegExp; msg: string; severity: TeamRawFinding['severity']; ruleId: string }> = [
    { regex: /console\.(log|debug)\(/, msg: 'console.log 발견', severity: 'info', ruleId: 'API-006' },
    { regex: /TODO|FIXME|HACK|XXX/, msg: 'TODO/FIXME 주석', severity: 'info', ruleId: 'STL-010' },
    { regex: /eval\s*\(/, msg: 'eval() 사용 (보안 위험)', severity: 'error', ruleId: 'SEC-006' },
    { regex: /document\.(write|writeln)\(/, msg: 'document.write (XSS)', severity: 'error', ruleId: 'API-009' },
    { regex: /innerHTML\s*=/, msg: 'innerHTML 직접 할당 (XSS)', severity: 'warning', ruleId: 'API-010' },
    { regex: /any[;\s,\)]/, msg: 'TypeScript any 타입', severity: 'warning', ruleId: 'TYP-001' },
    { regex: /\/\/\s*@ts-ignore/, msg: '@ts-ignore 사용', severity: 'warning', ruleId: 'TYP-003' },
    { regex: /password\s*=\s*['"`]/, msg: '하드코딩된 패스워드', severity: 'error', ruleId: 'SEC-009' },
    { regex: /\.then\(.*\.catch\(\s*\)/, msg: '빈 catch (에러 무시)', severity: 'warning', ruleId: 'ERR-001' },
    { regex: /new\s+Date\(\)\.getTime/, msg: 'Date.now() 대신 new Date().getTime()', severity: 'info', ruleId: 'LOG-019' },
  ];

  const ruleLinePat = /regex\s*:|\/.*\/[gimsuy]*\s*,|severity\s*:/;
  // 패턴별 최대 3건, 전체 최대 20건 — 점수 왜곡 방지
  const patternCounts = new Map<string, number>();
  for (let i = 0; i < lines.length; i++) {
    if (ruleLinePat.test(lines[i])) continue;
    if (findings.length >= 20) break;
    for (const p of patterns) {
      const cnt = patternCounts.get(p.msg) ?? 0;
      if (cnt >= 3) continue;
      if (p.regex.test(lines[i])) {
        findings.push({ line: i + 1, message: p.msg, severity: p.severity, ruleId: p.ruleId });
        patternCounts.set(p.msg, cnt + 1);
      }
    }
  }

  const score = Math.max(0, 100 - findings.filter(f => f.severity === 'error').length * 10 - findings.filter(f => f.severity === 'warning').length * 2);
  return { name: 'regex', score, findings };
}

function runASTFallback(code: string, _language: string): TeamPipelineChunk {
  const findings: TeamRawFinding[] = [];
  const lines = code.split('\n');

  // 함수 길이 검사
  let fnStart = -1;
  let braceDepth = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/function\s|=>|class\s/.test(lines[i])) fnStart = i;
    braceDepth += (lines[i].match(/\{/g) ?? []).length - (lines[i].match(/\}/g) ?? []).length;
    if (braceDepth === 0 && fnStart >= 0 && i - fnStart > 50) {
      findings.push({ line: fnStart + 1, message: `함수가 ${i - fnStart}줄 — 50줄 초과`, severity: 'warning' });
      fnStart = -1;
    }
  }

  // 중첩 깊이 검사 — 블록 진입 시 1회만 보고 (빠져나올 때까지 skip)
  let maxDepth = 0;
  let depth = 0;
  let deepBlockReported = false;
  for (let i = 0; i < lines.length; i++) {
    depth += (lines[i].match(/\{/g) ?? []).length;
    depth -= (lines[i].match(/\}/g) ?? []).length;
    if (depth > maxDepth) maxDepth = depth;
    if (depth > 5 && !deepBlockReported) {
      findings.push({ line: i + 1, message: `중첩 깊이 ${depth} — 5 초과`, severity: 'warning' });
      deepBlockReported = true;
    }
    if (depth <= 5) deepBlockReported = false;
  }

  // 파라미터 수 검사
  const fnParams = code.match(/function\s+\w+\(([^)]*)\)/g) ?? [];
  for (const fn of fnParams) {
    const params = fn.match(/\(([^)]*)\)/)?.[1]?.split(',').filter(Boolean) ?? [];
    if (params.length > 5) {
      findings.push({ line: 0, message: `파라미터 ${params.length}개 — 5개 초과`, severity: 'warning' });
    }
  }

  const capped = findings.slice(0, 15);
  const score = Math.max(0, 100 - capped.filter(f => f.severity === 'error').length * 15 - capped.filter(f => f.severity === 'warning').length * 5);
  return { name: 'ast', score, findings: capped };
}

function runHollowCheck(code: string): TeamPipelineChunk {
  const findings: TeamRawFinding[] = [];
  const lines = code.split('\n');

  // 빈 함수 탐지
  for (let i = 0; i < lines.length - 1; i++) {
    if (/function\s+\w+|=>\s*\{/.test(lines[i]) && /^\s*\}\s*$/.test(lines[i + 1])) {
      findings.push({ line: i + 1, message: '빈 함수 (구현 없음)', severity: 'error' });
    }
  }

  // throw new Error('Not implemented')
  for (let i = 0; i < lines.length; i++) {
    if (/throw\s+new\s+Error\(\s*['"`]Not\s+implemented/.test(lines[i])) {
      findings.push({ line: i + 1, message: 'Not implemented 예외', severity: 'error' });
    }
    if (/return\s+(null|undefined|void\s+0)\s*;?\s*\/\/\s*(TODO|FIXME|stub)/i.test(lines[i])) {
      findings.push({ line: i + 1, message: '스텁 반환값', severity: 'warning' });
    }
  }

  const score = Math.max(0, 100 - findings.filter(f => f.severity === 'error').length * 10 - findings.filter(f => f.severity === 'warning').length * 3);
  return { name: 'hollow', score, findings };
}

function runDeadCodeCheck(code: string): TeamPipelineChunk {
  const findings: TeamRawFinding[] = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    // return 이후 코드
    if (/^\s*return\b/.test(lines[i]) && i + 1 < lines.length && !/^\s*[})\]]/.test(lines[i + 1]) && lines[i + 1].trim() !== '') {
      findings.push({ line: i + 2, message: 'return 이후 도달 불가 코드', severity: 'warning' });
    }
    // 주석 처리된 코드
    if (/^\s*\/\/\s*(const|let|var|function|if|for|while|return|import)\s/.test(lines[i])) {
      findings.push({ line: i + 1, message: '주석 처리된 코드', severity: 'info' });
    }
  }

  const cappedDead = findings.slice(0, 10);
  const score = Math.max(0, 100 - cappedDead.filter(f => f.severity === 'warning').length * 10);
  return { name: 'dead-code', score, findings: cappedDead };
}

function runDesignLintCheck(code: string): TeamPipelineChunk {
  const findings: TeamRawFinding[] = [];

  // z-index 하드코딩
  const zMatches = code.match(/z-index:\s*\d+|z-\[\d+\]/g) ?? [];
  for (const m of zMatches) {
    findings.push({ line: 0, message: `z-index 하드코딩: ${m}`, severity: 'warning' });
  }

  // 매직 넘버 색상
  const colorMatches = code.match(/#[0-9a-f]{6}/gi) ?? [];
  if (colorMatches.length > 5) {
    findings.push({ line: 0, message: `하드코딩 색상 ${colorMatches.length}개 — 디자인 토큰 사용 권장`, severity: 'warning' });
  }

  const score = Math.max(0, 100 - findings.length * 10);
  return { name: 'design-lint', score, findings };
}

function runCognitiveLoadCheck(code: string): TeamPipelineChunk {
  const findings: TeamRawFinding[] = [];
  const lines = code.split('\n');

  // 긴 줄 — 파일당 최대 3건 (동일 유형 500건 폭발 방지)
  let lineWarnCount = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > 120 && lineWarnCount < 3) {
      findings.push({ line: i + 1, message: `줄 길이 ${lines[i].length}자 — 120자 초과`, severity: 'info' });
      lineWarnCount++;
    }
  }

  // 삼항 중첩
  for (let i = 0; i < lines.length; i++) {
    const ternaries = (lines[i].match(/\?/g) ?? []).length;
    if (ternaries >= 2) {
      findings.push({ line: i + 1, message: '중첩 삼항 연산자', severity: 'warning' });
    }
  }

  // 파일 크기
  if (lines.length > 300) {
    findings.push({ line: 0, message: `파일 ${lines.length}줄 — 300줄 초과, 분리 권장`, severity: 'warning' });
  }

  const cappedCog = findings.slice(0, 10);
  const score = Math.max(0, 100 - cappedCog.filter(f => f.severity === 'warning').length * 5);
  return { name: 'cognitive-load', score, findings: cappedCog };
}

function runBugPatternCheck(code: string, _language: string): TeamPipelineChunk {
  const findings: TeamRawFinding[] = [];
  const lines = code.split('\n');

  const bugPatterns: Array<{ regex: RegExp; msg: string; severity: TeamRawFinding['severity'] }> = [
    { regex: /===?\s*NaN/, msg: '=== NaN 비교 (Number.isNaN 사용)', severity: 'error' },
    { regex: /typeof\s+\w+\s*===?\s*['"`]undefined['"`]/, msg: 'typeof undefined 비교 대신 nullish 체크 권장', severity: 'info' },
    { regex: /parseInt\(\s*\w+\s*\)/, msg: 'parseInt radix 인수 누락', severity: 'warning' },
    { regex: /new\s+Array\(\d+\)/, msg: 'new Array(n) → Array.from 권장', severity: 'info' },
    { regex: /catch\s*\(\s*\)\s*\{/, msg: '에러 변수 없는 catch', severity: 'warning' },
    { regex: /\.forEach\(async/, msg: 'forEach(async) — for...of 사용 권장', severity: 'error' },
    { regex: /==\s+null[^=]|!=\s+null[^=]/, msg: '== null (=== null || === undefined 권장)', severity: 'info' },
  ];

  for (let i = 0; i < lines.length; i++) {
    for (const p of bugPatterns) {
      if (p.regex.test(lines[i])) {
        findings.push({ line: i + 1, message: p.msg, severity: p.severity });
      }
    }
  }

  const cappedBug = findings.slice(0, 15);
  const score = Math.max(0, 100 - cappedBug.filter(f => f.severity === 'error').length * 15 - cappedBug.filter(f => f.severity === 'warning').length * 5);
  return { name: 'bug-pattern', score, findings: cappedBug };
}

function runSecurityPatternCheck(code: string, _language: string): TeamPipelineChunk {
  const findings: TeamRawFinding[] = [];
  const lines = code.split('\n');

  const secPatterns: Array<{ regex: RegExp; msg: string; severity: TeamRawFinding['severity'] }> = [
    { regex: /eval\(/, msg: 'eval() 사용', severity: 'error' },
    { regex: /new\s+Function\(/, msg: 'new Function() (eval 동등)', severity: 'error' },
    { regex: /dangerouslySetInnerHTML/, msg: 'dangerouslySetInnerHTML (XSS)', severity: 'warning' },
    { regex: /process\.env\.\w+/, msg: 'process.env 직접 접근 — 환경변수 노출 주의', severity: 'info' },
    { regex: /https?:\/\/[^\s'"]+/, msg: 'URL 하드코딩', severity: 'info' },
    { regex: /BEGIN\s+(RSA|DSA|EC)\s+PRIVATE/, msg: '개인키 하드코딩', severity: 'error' },
    { regex: /api[_-]?key\s*[:=]\s*['"`]\w{10,}/, msg: 'API 키 하드코딩 의심', severity: 'error' },
  ];

  // Skip lines that are regex/rule definitions to avoid self-detection
  const ruleDefPattern = /regex\s*:|\/.*\/[gimsuy]*\s*,|severity\s*:/;
  for (let i = 0; i < lines.length; i++) {
    if (ruleDefPattern.test(lines[i])) continue;
    for (const p of secPatterns) {
      if (p.regex.test(lines[i])) {
        findings.push({ line: i + 1, message: p.msg, severity: p.severity });
      }
    }
  }

  const cappedSec = findings.slice(0, 15);
  const score = Math.max(0, 100 - cappedSec.filter(f => f.severity === 'error').length * 20 - cappedSec.filter(f => f.severity === 'warning').length * 10);
  return { name: 'security', score, findings: cappedSec };
}

// IDENTITY_SEAL: PART-2 | role=team-impls | inputs=code | outputs=findings

// ============================================================
// PART 3 — Hollow Scanner (re-export)
// ============================================================

export async function scanForHollowCode(code: string, fileName: string = 'unknown') {
  const result = runHollowCheck(code);
  return { fileName, ...result };
}

export async function scanDeadCode(code: string, _language: string = 'typescript') {
  return runDeadCodeCheck(code);
}

export async function runDesignLint(code: string) {
  return runDesignLintCheck(code);
}

export async function analyzeCognitiveLoad(code: string) {
  return runCognitiveLoadCheck(code);
}

export async function findBugsStatic(code: string, language: string = 'typescript') {
  return runBugPatternCheck(code, language);
}

// IDENTITY_SEAL: PART-3 | role=re-exports | inputs=code | outputs=various

// ============================================================
// PART 4 — Verification Loop
// ============================================================

export async function runVerificationLoop(
  code: string,
  language: string,
  maxRounds: number = 3,
): Promise<{ finalScore: number; rounds: number; result: PipelineResult }> {
  let result = await runStaticPipeline(code, language);
  let round = 1;

  while (result.score < 80 && round < maxRounds) {
    // Auto-fix 시도는 AI bridge가 필요하므로 여기서는 결과만 반환
    round++;
    result = await runStaticPipeline(code, language);
  }

  return { finalScore: result.score, rounds: round, result };
}

// IDENTITY_SEAL: PART-4 | role=verification-loop | inputs=code,language,maxRounds | outputs=result

// ============================================================
// PART 5 — Project Audit (16영역)
// ============================================================

export interface AuditArea {
  name: string;
  score: number;
  findings: string[];
  category: 'structure' | 'quality' | 'security' | 'performance';
}

export interface AuditReport {
  areas: AuditArea[];
  totalScore: number;
  hardGateFail: boolean;
  urgent: string[];
}

export async function runProjectAudit(
  rootPath: string,
  _onProgress?: (area: string, index: number, total: number) => void,
): Promise<AuditReport> {
  const { readdirSync, readFileSync, _statSync, existsSync } = require('fs');
  const { join, extname } = require('path');

  const areas: AuditArea[] = [];
  const urgent: string[] = [];

  // Collect project files
  const files: string[] = [];
  function walk(dir: string, depth: number = 0): void {
    if (depth > 5) return;
    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.') || ['node_modules', '.next', 'dist', 'build'].includes(entry.name)) continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full, depth + 1);
        else if (['.ts', '.tsx', '.js', '.jsx'].includes(extname(entry.name))) files.push(full);
      }
    } catch { /* permission denied */ }
  }
  walk(rootPath);

  _onProgress?.('files', 0, 16);

  // 1. 파일 구조
  const avgLines = files.length > 0
    ? Math.round(files.slice(0, 50).reduce((s, f) => { try { return s + readFileSync(f, 'utf-8').split('\n').length; } catch { return s; } }, 0) / Math.min(files.length, 50))
    : 0;
  const structureScore = avgLines < 300 ? 90 : avgLines < 500 ? 70 : 50;
  areas.push({ name: '파일 구조', score: structureScore, findings: [`평균 ${avgLines}줄/파일, ${files.length}개 파일`], category: 'structure' });

  // 2. 테스트 커버리지
  const hasTests = files.some(f => /test|spec|__tests__/i.test(f));
  areas.push({ name: '테스트', score: hasTests ? 70 : 20, findings: [hasTests ? '테스트 파일 존재' : '테스트 없음'], category: 'quality' });
  if (!hasTests) urgent.push('테스트 코드 없음');

  // 3. 보안
  let secretCount = 0;
  const secretPatterns = [/api[_-]?key\s*[:=]\s*['"`]\w{10,}/i, /password\s*[:=]\s*['"`]/i, /BEGIN\s+(RSA|DSA|EC)\s+PRIVATE/];
  for (const f of files.slice(0, 100)) {
    try {
      const content = readFileSync(f, 'utf-8');
      for (const p of secretPatterns) { if (p.test(content)) secretCount++; }
    } catch { /* skip */ }
  }
  areas.push({ name: '보안', score: secretCount === 0 ? 95 : Math.max(0, 70 - secretCount * 15), findings: [`시크릿 패턴 ${secretCount}건`], category: 'security' });
  if (secretCount > 0) urgent.push(`하드코딩 시크릿 ${secretCount}건`);

  // 4. 의존성
  const pkgPath = join(rootPath, 'package.json');
  let depCount = 0;
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      depCount = Object.keys(pkg.dependencies ?? {}).length;
    } catch { /* skip */ }
  }
  areas.push({ name: '의존성', score: depCount < 30 ? 90 : depCount < 60 ? 70 : 50, findings: [`${depCount}개 의존성`], category: 'performance' });

  // 5. 타입 안전
  let anyCount = 0;
  for (const f of files.slice(0, 50)) {
    try { anyCount += (readFileSync(f, 'utf-8').match(/:\s*any\b/g) ?? []).length; } catch { /* skip */ }
  }
  areas.push({ name: '타입 안전', score: anyCount === 0 ? 95 : Math.max(0, 85 - anyCount * 3), findings: [`any 타입 ${anyCount}건`], category: 'quality' });

  // 6. 에러 처리
  let emptyCatch = 0;
  for (const f of files.slice(0, 50)) {
    try { emptyCatch += (readFileSync(f, 'utf-8').match(/catch\s*\(\s*\)\s*\{/g) ?? []).length; } catch { /* skip */ }
  }
  areas.push({ name: '에러 처리', score: emptyCatch < 3 ? 85 : Math.max(0, 75 - emptyCatch * 5), findings: [`빈 catch ${emptyCatch}건`], category: 'quality' });

  // 7. 문서화
  const hasReadme = existsSync(join(rootPath, 'README.md'));
  const hasLicense = existsSync(join(rootPath, 'LICENSE'));
  const docScore = (hasReadme ? 40 : 0) + (hasLicense ? 30 : 0) + (depCount > 0 ? 20 : 0);
  areas.push({ name: '문서화', score: Math.min(100, docScore + 10), findings: [`README:${hasReadme ? 'O' : 'X'} LICENSE:${hasLicense ? 'O' : 'X'}`], category: 'structure' });

  // 8. 코드 스타일
  let inconsistentSemicolon = 0;
  for (const f of files.slice(0, 20)) {
    try {
      const content = readFileSync(f, 'utf-8');
      const withSemi = (content.match(/;\s*$/gm) ?? []).length;
      const withoutSemi = (content.match(/[^;{}\s]\s*$/gm) ?? []).length;
      if (withSemi > 5 && withoutSemi > 5) inconsistentSemicolon++;
    } catch { /* skip */ }
  }
  areas.push({ name: '코드 스타일', score: inconsistentSemicolon < 2 ? 90 : 60, findings: [`비일관 파일 ${inconsistentSemicolon}개`], category: 'quality' });

  // ── 추가 8영역 (어댑터 연동) ──
  _onProgress?.('adapters', 8, 16);

  // 9. ESLint 점수
  try {
    const { runFullLintAnalysis } = require('../adapters/lint-engine');
    const lint = await runFullLintAnalysis(rootPath, files[0]);
    areas.push({ name: 'ESLint', score: lint.avgScore, findings: lint.results.map(r => `${r.engine}: ${r.detail}`), category: 'quality' });
  } catch { areas.push({ name: 'ESLint', score: 70, findings: ['lint-engine 미설치'], category: 'quality' }); }

  // 10. 미사용 의존성
  try {
    const { runDepcheck } = require('../adapters/dep-analyzer');
    const dep = await runDepcheck(rootPath);
    areas.push({ name: '미사용 의존성', score: dep.score, findings: [`unused: ${dep.unused.length}, missing: ${dep.missing.length}`], category: 'performance' });
  } catch { areas.push({ name: '미사용 의존성', score: 80, findings: ['depcheck 미설치'], category: 'performance' }); }

  // 11. 심층 버그 (deep-verify)
  try {
    const { runDeepVerify } = require('./deep-verify');
    const sampleCode = files[0] ? readFileSync(files[0], 'utf-8') : '';
    if (sampleCode) {
      const deep = await runDeepVerify(sampleCode, files[0]);
      const p0 = deep.findings.filter((f: { severity?: string }) => f.severity === 'P0').length;
      areas.push({ name: '심층 버그', score: Math.max(0, 100 - p0 * 25), findings: [`P0: ${p0}건`], category: 'quality' });
      if (p0 > 0) urgent.push(`P0 심층 버그 ${p0}건`);
    }
  } catch { /* skip */ }

  // 12. 보안 취약점 (npm audit)
  try {
    const { runNpmAudit } = require('../adapters/security-engine');
    const audit = await runNpmAudit(rootPath);
    const score = Math.max(0, 100 - audit.critical * 30 - audit.high * 15);
    areas.push({ name: 'npm 취약점', score, findings: [`critical: ${audit.critical}, high: ${audit.high}`], category: 'security' });
    if (audit.critical > 0) urgent.push(`npm audit critical ${audit.critical}건`);
  } catch { /* skip */ }

  // 13. 접근성 (axe-core, HTML 파일 있을 때)
  try {
    const htmlFiles = files.filter(f => f.endsWith('.html') || f.endsWith('.tsx') || f.endsWith('.jsx'));
    if (htmlFiles.length > 0) {
      const { runAxeAccessibility } = require('../adapters/web-quality');
      const sample = readFileSync(htmlFiles[0], 'utf-8');
      const axe = await runAxeAccessibility(sample);
      areas.push({ name: '접근성', score: axe.score, findings: axe.findings.slice(0, 3).map(f => f.message), category: 'quality' });
    }
  } catch { /* skip */ }

  // 14. 코드 복잡도 (AST)
  try {
    const { analyzeWithTsMorph } = require('../adapters/ast-engine');
    const sampleCode = files[0] ? readFileSync(files[0], 'utf-8') : '';
    if (sampleCode) {
      const findings = await analyzeWithTsMorph(sampleCode, files[0]);
      const score = Math.max(0, 100 - findings.length * 10);
      areas.push({ name: 'AST 복잡도', score, findings: findings.slice(0, 3).map((f: { message: string }) => f.message), category: 'quality' });
    }
  } catch { /* skip */ }

  // 15. 구버전 API
  try {
    const { checkDeprecations } = require('./deprecation-checker');
    const sampleCode = files[0] ? readFileSync(files[0], 'utf-8') : '';
    if (sampleCode) {
      const deps = checkDeprecations(sampleCode, files[0], rootPath);
      const score = Math.max(0, 100 - deps.length * 15);
      areas.push({ name: '구버전 API', score, findings: deps.slice(0, 3).map((d: { message: string }) => d.message), category: 'quality' });
    }
  } catch { /* skip */ }

  // 16. 번들 크기
  try {
    const { checkBundleSize } = require('../adapters/web-quality');
    const bundle = await checkBundleSize(rootPath);
    areas.push({ name: '번들 크기', score: bundle.score, findings: [`heavy: ${bundle.heavyCount}, total deps: ${bundle.totalDeps}`], category: 'performance' });
  } catch { /* skip */ }

  const totalScore = Math.round(areas.reduce((s, a) => s + a.score, 0) / areas.length);
  const hardGateFail = areas.some(a => a.category === 'security' && a.score < 50);

  return { areas, totalScore, hardGateFail, urgent };
}

export function formatAuditReport(report: AuditReport, _lang: string = 'ko'): string {
  const lines: string[] = [];
  for (const area of report.areas) {
    const icon = area.score >= 80 ? '✅' : area.score >= 60 ? '⚠️' : '❌';
    lines.push(`  ${icon} ${area.name.padEnd(12)} ${area.score}/100  ${area.findings[0] ?? ''}`);
  }
  return lines.join('\n');
}

// IDENTITY_SEAL: PART-5 | role=project-audit | inputs=rootPath | outputs=AuditReport

// ============================================================
// PART 6 — Stress Analysis
// ============================================================

export interface StressScenario {
  name: string;
  description: string;
  metrics: { users: number; duration: number; rampUp: number };
}

export function getScenarios(): StressScenario[] {
  return [
    { name: 'normal', description: '일반 부하', metrics: { users: 10, duration: 30, rampUp: 5 } },
    { name: 'heavy', description: '고부하', metrics: { users: 100, duration: 60, rampUp: 10 } },
    { name: 'spike', description: '스파이크', metrics: { users: 500, duration: 15, rampUp: 1 } },
    { name: 'soak', description: '장시간', metrics: { users: 50, duration: 300, rampUp: 30 } },
    { name: 'breakpoint', description: '한계점 탐색', metrics: { users: 1000, duration: 30, rampUp: 5 } },
  ];
}

export async function analyzeStress(code: string, _scenario: string): Promise<{
  score: number;
  risks: Array<{ type: string; severity: string; detail: string }>;
  recommendations: string[];
}> {
  const risks: Array<{ type: string; severity: string; detail: string }> = [];
  const recommendations: string[] = [];

  // 정적 분석 기반 스트레스 예측
  const nestedLoops = (code.match(/for\s*\(.*\{[\s\S]*?for\s*\(/g) ?? []).length;
  if (nestedLoops > 0) {
    risks.push({ type: 'nested-loop', severity: 'high', detail: `중첩 루프 ${nestedLoops}개 — O(n²) 이상` });
    recommendations.push('중첩 루프를 Map/Set 기반으로 리팩토링');
  }

  const syncIO = (code.match(/readFileSync|writeFileSync|execSync/g) ?? []).length;
  if (syncIO > 3) {
    risks.push({ type: 'sync-io', severity: 'medium', detail: `동기 I/O ${syncIO}건 — 이벤트 루프 블로킹` });
    recommendations.push('비동기 API (readFile, exec) 전환');
  }

  const unboundedArrays = (code.match(/\.push\(/g) ?? []).length;
  if (unboundedArrays > 5) {
    risks.push({ type: 'memory', severity: 'medium', detail: `무한 성장 가능 배열 ${unboundedArrays}건` });
    recommendations.push('배열 크기 상한 설정 또는 스트리밍 처리');
  }

  const globalState = (code.match(/let\s+\w+\s*[:=]/gm) ?? []).length;
  if (globalState > 10) {
    risks.push({ type: 'state', severity: 'low', detail: `가변 상태 ${globalState}건` });
  }

  const score = Math.max(0, 100 - risks.filter(r => r.severity === 'high').length * 25 - risks.filter(r => r.severity === 'medium').length * 10 - risks.filter(r => r.severity === 'low').length * 3);

  return { score, risks, recommendations };
}

// IDENTITY_SEAL: PART-6 | role=stress-analysis | inputs=code,scenario | outputs=risks

// ============================================================
// PART 7 — Patent/IP Scanner
// ============================================================

export async function scanProject(rootPath: string): Promise<{
  findings: Array<{ file: string; pattern: string; severity: string }>;
  score: number;
}> {
  const { readdirSync, readFileSync } = require('fs');
  const { join, extname } = require('path');

  const findings: Array<{ file: string; pattern: string; severity: string }> = [];

  const patterns: Array<{ regex: RegExp; name: string; severity: string }> = [
    { regex: /eval\s*\(/g, name: 'eval() 사용', severity: 'high' },
    { regex: /new\s+Function\s*\(/g, name: 'new Function()', severity: 'high' },
    { regex: /document\.write\s*\(/g, name: 'document.write()', severity: 'high' },
    { regex: /innerHTML\s*=/g, name: 'innerHTML 할당', severity: 'medium' },
    { regex: /dangerouslySetInnerHTML/g, name: 'dangerouslySetInnerHTML', severity: 'medium' },
    { regex: /exec\s*\(\s*['"`]/g, name: '셸 명령 실행', severity: 'high' },
  ];

  function walk(dir: string, depth: number = 0): void {
    if (depth > 5) return;
    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.') || ['node_modules', '.next', 'dist'].includes(entry.name)) continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full, depth + 1);
        else if (['.ts', '.tsx', '.js', '.jsx'].includes(extname(entry.name))) {
          // Skip pipeline/lint rule files to avoid self-detection false positives
          if (entry.name === 'pipeline-bridge.ts' || entry.name === 'pipeline-bridge.js') continue;
          try {
            const content = readFileSync(full, 'utf-8');
            for (const p of patterns) {
              const matches = content.match(p.regex);
              if (matches) {
                findings.push({ file: full.replace(rootPath + '/', ''), pattern: p.name, severity: p.severity });
              }
            }
          } catch { /* skip unreadable */ }
        }
      }
    } catch { /* permission denied */ }
  }

  walk(rootPath);

  const score = Math.max(0, 100 - findings.filter(f => f.severity === 'high').length * 20 - findings.filter(f => f.severity === 'medium').length * 10);
  return { findings, score };
}

// IDENTITY_SEAL: PART-7 | role=patent-scanner | inputs=rootPath | outputs=findings
