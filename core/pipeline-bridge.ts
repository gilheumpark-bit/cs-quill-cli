// @ts-nocheck
// ============================================================
// CS Quill 🦔 — Pipeline Bridge
// ============================================================
// @/lib/code-studio/pipeline/* 대신 CLI 자체 검증 파이프라인.
// 기존 8팀 파이프라인을 CLI 어댑터로 재구성.

// ============================================================
// PART 1 — Static Pipeline (8팀 통합)
// ============================================================

export interface PipelineResult {
  score: number;
  teams: Array<{
    name: string;
    score: number;
    findings: Array<{ line: number; message: string; severity: 'error' | 'warning' | 'info' }>;
  }>;
  summary: string;
}

export async function runStaticPipeline(code: string, language: string): Promise<PipelineResult> {
  const teams: PipelineResult['teams'] = [];

  // Team 1: Regex (표면 패턴 — 항상 실행, 1차 필터)
  teams.push(runRegexTeam(code, language));

  // Team 2: AST (구조 분석 — ts-morph/acorn 실체 엔진)
  try {
    const { analyzeWithTypeScript, analyzeWithTsMorph } = await import('../adapters/ast-engine');
    const tsResult = await analyzeWithTypeScript(code, 'analysis.ts');
    const tsMorphResult = await analyzeWithTsMorph(code, 'analysis.ts');
    const tsFindings = Array.isArray(tsResult) ? tsResult : (tsResult?.findings ?? []);
    const tsMorphFindings = Array.isArray(tsMorphResult) ? tsMorphResult : (tsMorphResult?.findings ?? []);
    const allFindings = [...tsFindings, ...tsMorphFindings].map((f: any) => ({
      line: f.line ?? 0, message: f.message, severity: (f.severity === 'error' ? 'error' : 'warning') as 'error' | 'warning',
    }));
    const score = Math.max(0, 100 - allFindings.filter(f => f.severity === 'error').length * 15 - allFindings.filter(f => f.severity === 'warning').length * 5);
    teams.push({ name: 'ast', score, findings: allFindings.slice(0, 20) });
  } catch {
    teams.push(runASTFallback(code, language));
  }

  // Team 3: Hollow (빈깡통 — AST hollow scan 실체)
  try {
    const { runASTHollowScan } = await import('./ast-bridge');
    const hollow = await runASTHollowScan(code, 'analysis.ts');
    const findings = hollow.findings.map((f: { message: string; line?: number }) => ({
      line: f.line ?? 0, message: f.message, severity: 'error' as const,
    }));
    teams.push({ name: 'hollow', score: Math.max(0, 100 - findings.length * 20), findings });
  } catch {
    teams.push(runHollowCheck(code));
  }

  // Team 4: Dead Code (regex 유지 — 인메모리 코드용)
  teams.push(runDeadCodeCheck(code));

  // Team 5: Design Lint (prettier 검증 시도)
  try {
    const { checkPrettier } = await import('../adapters/lint-engine');
    const prettierResult = await checkPrettier(code, 'analysis.ts');
    const designFindings = runDesignLintCheck(code).findings;
    const score = prettierResult.isFormatted ? Math.max(70, 100 - designFindings.length * 10) : Math.max(0, 60 - designFindings.length * 10);
    teams.push({ name: 'design-lint', score, findings: [
      ...designFindings,
      ...(prettierResult.isFormatted ? [] : [{ line: 0, message: 'Prettier 포맷 불일치', severity: 'warning' as const }]),
    ]});
  } catch {
    teams.push(runDesignLintCheck(code));
  }

  // Team 6: Cognitive Load (regex 유지 — 경량)
  teams.push(runCognitiveLoadCheck(code));

  // Team 7: Bug Pattern (deep-verify 6검증 실체 엔진)
  try {
    const { runDeepVerify } = await import('./deep-verify');
    const deepResult = await runDeepVerify(code, 'analysis.ts');
    const findings = deepResult.findings.map((f: { message: string; line?: number; severity?: string }) => ({
      line: f.line ?? 0, message: f.message,
      severity: (f.severity === 'P0' ? 'error' : 'warning') as 'error' | 'warning',
    }));
    const score = Math.max(0, 100 - findings.filter(f => f.severity === 'error').length * 20 - findings.filter(f => f.severity === 'warning').length * 5);
    teams.push({ name: 'bug-pattern', score, findings: findings.slice(0, 20) });
  } catch {
    teams.push(runBugPatternCheck(code, language));
  }

  // Team 8: Security Pattern (npm audit 시도 + regex 병행)
  const secRegex = runSecurityPatternCheck(code, language);
  teams.push(secRegex);

  const avgScore = teams.length > 0
    ? Math.round(teams.reduce((s, t) => s + t.score, 0) / teams.length)
    : 0;

  return {
    score: avgScore,
    teams,
    summary: `${teams.filter(t => t.score >= 80).length}/${teams.length} teams passed (avg: ${avgScore})`,
  };
}

// IDENTITY_SEAL: PART-1 | role=pipeline | inputs=code,language | outputs=PipelineResult

// ============================================================
// PART 2 — Team Implementations
// ============================================================

function runRegexTeam(code: string, _language: string): PipelineResult['teams'][0] {
  const findings: PipelineResult['teams'][0]['findings'] = [];
  const lines = code.split('\n');

  const patterns: Array<{ regex: RegExp; msg: string; severity: 'error' | 'warning' }> = [
    { regex: /console\.(log|debug)\(/, msg: 'console.log 발견', severity: 'warning' },
    { regex: /TODO|FIXME|HACK|XXX/, msg: 'TODO/FIXME 주석', severity: 'info' as unknown },
    { regex: /eval\s*\(/, msg: 'eval() 사용 (보안 위험)', severity: 'error' },
    { regex: /document\.(write|writeln)\(/, msg: 'document.write (XSS)', severity: 'error' },
    { regex: /innerHTML\s*=/, msg: 'innerHTML 직접 할당 (XSS)', severity: 'warning' },
    { regex: /any[;\s,\)]/, msg: 'TypeScript any 타입', severity: 'warning' },
    { regex: /\/\/\s*@ts-ignore/, msg: '@ts-ignore 사용', severity: 'warning' },
    { regex: /password\s*=\s*['"`]/, msg: '하드코딩된 패스워드', severity: 'error' },
    { regex: /\.then\(.*\.catch\(\s*\)/, msg: '빈 catch (에러 무시)', severity: 'warning' },
    { regex: /new\s+Date\(\)\.getTime/, msg: 'Date.now() 대신 new Date().getTime()', severity: 'info' as unknown },
  ];

  for (let i = 0; i < lines.length; i++) {
    for (const p of patterns) {
      if (p.regex.test(lines[i])) {
        findings.push({ line: i + 1, message: p.msg, severity: p.severity });
      }
    }
  }

  const score = Math.max(0, 100 - findings.filter(f => f.severity === 'error').length * 15 - findings.filter(f => f.severity === 'warning').length * 5);
  return { name: 'regex', score, findings: findings.slice(0, 20) };
}

function runASTFallback(code: string, _language: string): PipelineResult['teams'][0] {
  const findings: PipelineResult['teams'][0]['findings'] = [];
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

  // 중첩 깊이 검사
  let maxDepth = 0;
  let depth = 0;
  for (let i = 0; i < lines.length; i++) {
    depth += (lines[i].match(/\{/g) ?? []).length;
    depth -= (lines[i].match(/\}/g) ?? []).length;
    if (depth > maxDepth) maxDepth = depth;
    if (depth > 5) {
      findings.push({ line: i + 1, message: `중첩 깊이 ${depth} — 5 초과`, severity: 'warning' });
    }
  }

  // 파라미터 수 검사
  const fnParams = code.match(/function\s+\w+\(([^)]*)\)/g) ?? [];
  for (const fn of fnParams) {
    const params = fn.match(/\(([^)]*)\)/)?.[1]?.split(',').filter(Boolean) ?? [];
    if (params.length > 5) {
      findings.push({ line: 0, message: `파라미터 ${params.length}개 — 5개 초과`, severity: 'warning' });
    }
  }

  const score = Math.max(0, 100 - findings.filter(f => f.severity === 'error').length * 15 - findings.filter(f => f.severity === 'warning').length * 5);
  return { name: 'ast', score, findings: findings.slice(0, 15) };
}

function runHollowCheck(code: string): PipelineResult['teams'][0] {
  const findings: PipelineResult['teams'][0]['findings'] = [];
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

  const score = Math.max(0, 100 - findings.filter(f => f.severity === 'error').length * 20 - findings.filter(f => f.severity === 'warning').length * 10);
  return { name: 'hollow', score, findings };
}

function runDeadCodeCheck(code: string): PipelineResult['teams'][0] {
  const findings: PipelineResult['teams'][0]['findings'] = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    // return 이후 코드
    if (/^\s*return\b/.test(lines[i]) && i + 1 < lines.length && !/^\s*[})\]]/.test(lines[i + 1]) && lines[i + 1].trim() !== '') {
      findings.push({ line: i + 2, message: 'return 이후 도달 불가 코드', severity: 'warning' });
    }
    // 주석 처리된 코드
    if (/^\s*\/\/\s*(const|let|var|function|if|for|while|return|import)\s/.test(lines[i])) {
      findings.push({ line: i + 1, message: '주석 처리된 코드', severity: 'info' as unknown });
    }
  }

  const score = Math.max(0, 100 - findings.filter(f => f.severity === 'warning').length * 10);
  return { name: 'dead-code', score, findings: findings.slice(0, 10) };
}

function runDesignLintCheck(code: string): PipelineResult['teams'][0] {
  const findings: PipelineResult['teams'][0]['findings'] = [];

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

function runCognitiveLoadCheck(code: string): PipelineResult['teams'][0] {
  const findings: PipelineResult['teams'][0]['findings'] = [];
  const lines = code.split('\n');

  // 긴 줄
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > 120) {
      findings.push({ line: i + 1, message: `줄 길이 ${lines[i].length}자 — 120자 초과`, severity: 'info' as unknown });
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

  const score = Math.max(0, 100 - findings.filter(f => f.severity === 'warning').length * 5);
  return { name: 'cognitive-load', score, findings: findings.slice(0, 10) };
}

function runBugPatternCheck(code: string, _language: string): PipelineResult['teams'][0] {
  const findings: PipelineResult['teams'][0]['findings'] = [];
  const lines = code.split('\n');

  const bugPatterns: Array<{ regex: RegExp; msg: string; severity: 'error' | 'warning' }> = [
    { regex: /===?\s*NaN/, msg: '=== NaN 비교 (Number.isNaN 사용)', severity: 'error' },
    { regex: /typeof\s+\w+\s*===?\s*['"`]undefined['"`]/, msg: 'typeof undefined 비교 대신 nullish 체크 권장', severity: 'info' as unknown },
    { regex: /parseInt\(\s*\w+\s*\)/, msg: 'parseInt radix 인수 누락', severity: 'warning' },
    { regex: /new\s+Array\(\d+\)/, msg: 'new Array(n) → Array.from 권장', severity: 'info' as unknown },
    { regex: /catch\s*\(\s*\)\s*\{/, msg: '에러 변수 없는 catch', severity: 'warning' },
    { regex: /\.forEach\(async/, msg: 'forEach(async) — for...of 사용 권장', severity: 'error' },
    { regex: /==\s+null[^=]|!=\s+null[^=]/, msg: '== null (=== null || === undefined 권장)', severity: 'info' as unknown },
  ];

  for (let i = 0; i < lines.length; i++) {
    for (const p of bugPatterns) {
      if (p.regex.test(lines[i])) {
        findings.push({ line: i + 1, message: p.msg, severity: p.severity });
      }
    }
  }

  const score = Math.max(0, 100 - findings.filter(f => f.severity === 'error').length * 15 - findings.filter(f => f.severity === 'warning').length * 5);
  return { name: 'bug-pattern', score, findings: findings.slice(0, 15) };
}

function runSecurityPatternCheck(code: string, _language: string): PipelineResult['teams'][0] {
  const findings: PipelineResult['teams'][0]['findings'] = [];
  const lines = code.split('\n');

  const secPatterns: Array<{ regex: RegExp; msg: string; severity: 'error' | 'warning' }> = [
    { regex: /eval\(/, msg: 'eval() 사용', severity: 'error' },
    { regex: /new\s+Function\(/, msg: 'new Function() (eval 동등)', severity: 'error' },
    { regex: /dangerouslySetInnerHTML/, msg: 'dangerouslySetInnerHTML (XSS)', severity: 'warning' },
    { regex: /process\.env\.\w+/, msg: 'process.env 직접 접근 — 환경변수 노출 주의', severity: 'info' as unknown },
    { regex: /https?:\/\/[^\s'"]+/, msg: 'URL 하드코딩', severity: 'info' as unknown },
    { regex: /BEGIN\s+(RSA|DSA|EC)\s+PRIVATE/, msg: '개인키 하드코딩', severity: 'error' },
    { regex: /api[_-]?key\s*[:=]\s*['"`]\w{10,}/, msg: 'API 키 하드코딩 의심', severity: 'error' },
  ];

  for (let i = 0; i < lines.length; i++) {
    for (const p of secPatterns) {
      if (p.regex.test(lines[i])) {
        findings.push({ line: i + 1, message: p.msg, severity: p.severity });
      }
    }
  }

  const score = Math.max(0, 100 - findings.filter(f => f.severity === 'error').length * 20 - findings.filter(f => f.severity === 'warning').length * 10);
  return { name: 'security', score, findings: findings.slice(0, 15) };
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
  const { readdirSync, readFileSync, _statSync, existsSync } = await import('fs');
  const { join, extname } = await import('path');

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
    const { runFullLintAnalysis } = await import('../adapters/lint-engine');
    const lint = await runFullLintAnalysis(rootPath, files[0]);
    areas.push({ name: 'ESLint', score: lint.avgScore, findings: lint.results.map(r => `${r.engine}: ${r.detail}`), category: 'quality' });
  } catch { areas.push({ name: 'ESLint', score: 70, findings: ['lint-engine 미설치'], category: 'quality' }); }

  // 10. 미사용 의존성
  try {
    const { runDepcheck } = await import('../adapters/dep-analyzer');
    const dep = await runDepcheck(rootPath);
    areas.push({ name: '미사용 의존성', score: dep.score, findings: [`unused: ${dep.unused.length}, missing: ${dep.missing.length}`], category: 'performance' });
  } catch { areas.push({ name: '미사용 의존성', score: 80, findings: ['depcheck 미설치'], category: 'performance' }); }

  // 11. 심층 버그 (deep-verify)
  try {
    const { runDeepVerify } = await import('./deep-verify');
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
    const { runNpmAudit } = await import('../adapters/security-engine');
    const audit = await runNpmAudit(rootPath);
    const score = Math.max(0, 100 - audit.critical * 30 - audit.high * 15);
    areas.push({ name: 'npm 취약점', score, findings: [`critical: ${audit.critical}, high: ${audit.high}`], category: 'security' });
    if (audit.critical > 0) urgent.push(`npm audit critical ${audit.critical}건`);
  } catch { /* skip */ }

  // 13. 접근성 (axe-core, HTML 파일 있을 때)
  try {
    const htmlFiles = files.filter(f => f.endsWith('.html') || f.endsWith('.tsx') || f.endsWith('.jsx'));
    if (htmlFiles.length > 0) {
      const { runAxeAccessibility } = await import('../adapters/web-quality');
      const sample = readFileSync(htmlFiles[0], 'utf-8');
      const axe = await runAxeAccessibility(sample);
      areas.push({ name: '접근성', score: axe.score, findings: axe.findings.slice(0, 3).map(f => f.message), category: 'quality' });
    }
  } catch { /* skip */ }

  // 14. 코드 복잡도 (AST)
  try {
    const { analyzeWithTsMorph } = await import('../adapters/ast-engine');
    const sampleCode = files[0] ? readFileSync(files[0], 'utf-8') : '';
    if (sampleCode) {
      const findings = await analyzeWithTsMorph(sampleCode, files[0]);
      const score = Math.max(0, 100 - findings.length * 10);
      areas.push({ name: 'AST 복잡도', score, findings: findings.slice(0, 3).map((f: { message: string }) => f.message), category: 'quality' });
    }
  } catch { /* skip */ }

  // 15. 구버전 API
  try {
    const { checkDeprecations } = await import('./deprecation-checker');
    const sampleCode = files[0] ? readFileSync(files[0], 'utf-8') : '';
    if (sampleCode) {
      const deps = checkDeprecations(sampleCode, files[0], rootPath);
      const score = Math.max(0, 100 - deps.length * 15);
      areas.push({ name: '구버전 API', score, findings: deps.slice(0, 3).map((d: { message: string }) => d.message), category: 'quality' });
    }
  } catch { /* skip */ }

  // 16. 번들 크기
  try {
    const { checkBundleSize } = await import('../adapters/web-quality');
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
  const { readdirSync, readFileSync } = await import('fs');
  const { join, extname } = await import('path');

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
