// ============================================================
// CS Quill 🦔 — Precision Checklist (단일 키 정밀 타격)
// ============================================================
// 크로스모델 없이 키 1개로도 Agent 리뷰 수준 달성.
// 91건 실전 버그 분석에서 도출한 48개 체크 항목.

// ============================================================
// PART 1 — Checklist Categories
// ============================================================

export interface CheckItem {
  id: string;
  category: string;
  severity: 'P0' | 'P1' | 'P2';
  question: string;
  lookFor: string;
  example?: string;
}

// ============================================================
// PART 2 — P0 Crash Prevention (17 items)
// ============================================================

const P0_CHECKS: CheckItem[] = [
  // 선언 순서
  {
    id: 'P0-01', category: 'declaration', severity: 'P0',
    question: '변수가 선언되기 전에 사용되는 곳이 있는가?',
    lookFor: 'const/let 선언보다 위에서 해당 변수를 참조하는 코드',
    example: 'line 300에서 fileName 사용 → line 410에서 const fileName = ... 선언',
  },
  {
    id: 'P0-02', category: 'declaration', severity: 'P0',
    question: '중복 선언된 변수가 있는가? (같은 스코프에 const 2번)',
    lookFor: '같은 이름의 const/let이 같은 함수 안에서 2번 선언',
    example: 'const fileName = ... (line 290) + const fileName = ... (line 410)',
  },

  // Brace 구조
  {
    id: 'P0-03', category: 'brace', severity: 'P0',
    question: 'for/if/try-catch의 중괄호가 올바르게 닫히는가?',
    lookFor: '중첩 루프/조건문에서 } 개수가 { 개수와 불일치',
    example: 'for { for { } } catch { } ← catch가 for 밖인지 안인지',
  },
  {
    id: 'P0-04', category: 'brace', severity: 'P0',
    question: 'try-catch 구조가 올바른가? (try 없이 catch, 또는 catch가 엉뚱한 위치)',
    lookFor: '들여쓰기가 어긋난 catch 블록',
    example: '    }\n  }\n  } catch { ← catch가 어디에 속하는지 불명확',
  },

  // 미정의 참조
  {
    id: 'P0-05', category: 'reference', severity: 'P0',
    question: 'dynamic import의 모듈 경로가 실제 존재하는 파일인가?',
    lookFor: "await import('../commands/undo') ← undo.ts 파일 실제 존재?",
    example: 'runUndo는 apply.ts에 있는데 undo.ts에서 import 시도',
  },
  {
    id: 'P0-06', category: 'reference', severity: 'P0',
    question: 'import한 함수 이름이 export된 이름과 일치하는가?',
    lookFor: '{ runVerify } ← 해당 파일에서 export function runVerify 확인',
  },
  {
    id: 'P0-07', category: 'reference', severity: 'P0',
    question: '함수 호출 시 인자 수와 타입이 함수 정의와 일치하는가?',
    lookFor: 'runGenerate(prompt, opts) ← 정의는 (prompt: string, opts: GenerateOptions)',
  },

  // Null/Undefined
  {
    id: 'P0-08', category: 'null', severity: 'P0',
    question: 'API 응답이나 JSON.parse 결과를 체크 없이 사용하는가?',
    lookFor: 'JSON.parse(raw) → .field ← try-catch 없이',
    example: 'const data = JSON.parse(output); data.results.map(...) ← data가 null이면?',
  },
  {
    id: 'P0-09', category: 'null', severity: 'P0',
    question: '배열이 비어있을 때 [0] 접근하는가?',
    lookFor: 'array[0].property ← array가 빈 배열이면 undefined.property → crash',
  },
  {
    id: 'P0-10', category: 'null', severity: 'P0',
    question: 'optional chaining 없이 깊은 객체 접근하는가?',
    lookFor: 'result.data.items.first.name ← 중간에 undefined 가능',
  },

  // 비동기
  {
    id: 'P0-11', category: 'async', severity: 'P0',
    question: 'async 함수 안에서 await 빠뜨린 Promise가 있는가?',
    lookFor: 'streamChat({...}) ← await 없이 호출하면 Promise만 반환, 실행 안 됨',
  },
  {
    id: 'P0-12', category: 'async', severity: 'P0',
    question: '무한 대기 가능한 await가 있는가? (timeout 없음)',
    lookFor: 'await fetch(...) ← AbortSignal.timeout 없이',
  },

  // 파일/시스템
  {
    id: 'P0-13', category: 'system', severity: 'P0',
    question: 'readFileSync/writeFileSync가 존재하지 않는 경로에 접근하는가?',
    lookFor: 'readFileSync(path) ← existsSync(path) 체크 없이',
  },
  {
    id: 'P0-14', category: 'system', severity: 'P0',
    question: 'execSync에 timeout이 없어 프로세스가 영구 대기하는가?',
    lookFor: 'execSync(cmd) ← { timeout: 30000 } 없이',
  },
  {
    id: 'P0-15', category: 'system', severity: 'P0',
    question: 'process.exit() 또는 process.exitCode를 잘못된 곳에서 호출하는가?',
    lookFor: 'cleanup 전에 exit, 또는 조건 없이 exitCode = 1',
  },

  // 타입
  {
    id: 'P0-16', category: 'type', severity: 'P0',
    question: 'parseInt/parseFloat 결과가 NaN인 경우를 체크하는가?',
    lookFor: "parseInt(userInput) ← isNaN 체크 없이 연산에 사용",
    example: "const port = parseInt('abc') → NaN → server.listen(NaN) → crash",
  },
  {
    id: 'P0-17', category: 'type', severity: 'P0',
    question: '정규식이 유효하지 않은 입력에서 무한 백트래킹하는가?',
    lookFor: '중첩 반복자 (a+)+ 패턴의 정규식',
  },
];

// ============================================================
// PART 3 — P1 Wrong Result Prevention (16 items)
// ============================================================

const P1_CHECKS: CheckItem[] = [
  // 수학/논리
  {
    id: 'P1-01', category: 'math', severity: 'P1',
    question: '0-100 범위 점수를 다시 ×100 하고 있는가?',
    lookFor: 'score * 100 ← score가 이미 0-100이면 0-10000이 됨',
    example: 'csScore = Math.round(weightedScore * 100) ← weightedScore가 이미 78이면 7800',
  },
  {
    id: 'P1-02', category: 'math', severity: 'P1',
    question: '나눗셈에서 0으로 나누는 경우가 가능한가?',
    lookFor: 'total / count ← count가 0일 수 있는데 Math.max(1, count) 안 함',
  },
  {
    id: 'P1-03', category: 'math', severity: 'P1',
    question: '.sort()가 원본 배열을 변조하는가?',
    lookFor: 'array.sort() ← [...array].sort() 아니면 원본도 바뀜',
  },

  // 타입 캐스팅
  {
    id: 'P1-04', category: 'cast', severity: 'P1',
    question: 'as string[] 등 강제 캐스팅이 실제 타입과 일치하는가?',
    lookFor: '(findings as string[]).map(f => f.message) ← findings가 object[]이면 crash',
  },
  {
    id: 'P1-05', category: 'cast', severity: 'P1',
    question: 'as never 또는 as any가 타입 오류를 숨기는가?',
    lookFor: 'provider: provider as never ← 진짜 타입이 안 맞는 건 아닌지',
  },

  // 비교 연산
  {
    id: 'P1-06', category: 'comparison', severity: 'P1',
    question: '== 대신 === 를 사용하는가?',
    lookFor: "value == null ← 의도적? value === null || value === undefined",
  },
  {
    id: 'P1-07', category: 'comparison', severity: 'P1',
    question: '문자열과 숫자를 혼합 비교하는가?',
    lookFor: "score >= '80' ← 문자열 비교가 되어 잘못된 결과",
  },

  // 배열/객체
  {
    id: 'P1-08', category: 'collection', severity: 'P1',
    question: 'Map/Set에서 객체를 키로 쓸 때 참조 비교 문제가 있는가?',
    lookFor: 'map.get({ key: value }) ← 매번 새 객체라 항상 undefined',
  },
  {
    id: 'P1-09', category: 'collection', severity: 'P1',
    question: '배열 반복 중에 배열을 수정하는가? (splice in loop)',
    lookFor: 'for (const item of array) { array.splice(i, 1); } ← 인덱스 꼬임',
  },
  {
    id: 'P1-10', category: 'collection', severity: 'P1',
    question: 'Object.entries/keys 결과의 순서에 의존하는가?',
    lookFor: '숫자 키 객체에서 순서 가정 (JS는 숫자 키를 먼저 정렬)',
  },

  // 문자열
  {
    id: 'P1-11', category: 'string', severity: 'P1',
    question: '사용자 입력을 정규식에 직접 넣는가?',
    lookFor: 'new RegExp(userInput) ← 특수문자 escape 안 하면 에러',
  },
  {
    id: 'P1-12', category: 'string', severity: 'P1',
    question: '파일 경로에 사용자 입력을 직접 연결하는가?',
    lookFor: "join(dir, userInput) ← '../../../etc/passwd' 가능",
  },

  // 상태
  {
    id: 'P1-13', category: 'state', severity: 'P1',
    question: '모듈 레벨 let 변수가 요청 간 공유되는가?',
    lookFor: 'let _cache = null ← 서로 다른 호출에서 오래된 값 참조',
  },
  {
    id: 'P1-14', category: 'state', severity: 'P1',
    question: '정규식에 /g 플래그가 있을 때 lastIndex 리셋하는가?',
    lookFor: 'const re = /pattern/g; re.test(a); re.test(b); ← lastIndex 누적',
    example: 'deprecation-checker.ts의 pattern.lastIndex = 0; 이 필요한 이유',
  },

  // API
  {
    id: 'P1-15', category: 'api', severity: 'P1',
    question: 'JSON.stringify 시 circular reference가 가능한가?',
    lookFor: 'JSON.stringify(obj) ← obj 안에 자기 참조 있으면 crash',
  },
  {
    id: 'P1-16', category: 'api', severity: 'P1',
    question: 'Promise.all에서 하나 실패 시 전체 실패 처리가 되는가?',
    lookFor: 'await Promise.all([...]) ← 하나 reject → 전부 잃음. allSettled 필요?',
  },
];

// ============================================================
// PART 4 — P2 UX/Resource Prevention (15 items)
// ============================================================

const P2_CHECKS: CheckItem[] = [
  // 리소스
  {
    id: 'P2-01', category: 'resource', severity: 'P2',
    question: 'readline/rl이 모든 코드 경로에서 close 되는가?',
    lookFor: 'createInterface → .question → rl.close() ← error 경로에서도?',
    example: 'try-finally { rl.close() } 패턴 필요',
  },
  {
    id: 'P2-02', category: 'resource', severity: 'P2',
    question: 'setInterval이 clearInterval로 정리되는가?',
    lookFor: 'const timer = setInterval(...) ← clearInterval(timer) 존재?',
  },
  {
    id: 'P2-03', category: 'resource', severity: 'P2',
    question: 'spawn된 자식 프로세스가 kill/close 처리되는가?',
    lookFor: 'spawn(...) ← .kill() 또는 on("close") 존재?',
  },
  {
    id: 'P2-04', category: 'resource', severity: 'P2',
    question: '임시 파일/디렉토리가 정리되는가?',
    lookFor: 'mkdirSync(tmpDir) ← finally { rmSync(tmpDir) } 존재?',
  },

  // UX
  {
    id: 'P2-05', category: 'ux', severity: 'P2',
    question: '에러 메시지가 사용자에게 도움이 되는가?',
    lookFor: "catch { } 또는 catch { console.log('error') } ← 원인 모름",
  },
  {
    id: 'P2-06', category: 'ux', severity: 'P2',
    question: '긴 작업에 진행률 표시가 있는가?',
    lookFor: 'for (const file of files) { await heavyWork() } ← 진행률 없음',
  },
  {
    id: 'P2-07', category: 'ux', severity: 'P2',
    question: 'watch 모드에서 debounce가 있는가?',
    lookFor: 'watch(path, callback) ← 빠른 연속 변경 시 중복 실행',
  },
  {
    id: 'P2-08', category: 'ux', severity: 'P2',
    question: '에러 메시지 언어가 설정 언어와 일치하는가?',
    lookFor: "config.language === 'en' 인데 한국어 에러 메시지",
  },

  // 성능
  {
    id: 'P2-09', category: 'performance', severity: 'P2',
    question: 'N+1 패턴이 있는가? (루프 안에서 await)',
    lookFor: 'for (...) { await fetch/db/api } ← Promise.all로 배치 가능?',
  },
  {
    id: 'P2-10', category: 'performance', severity: 'P2',
    question: '파일을 반복 읽기하는가? (캐시 없이)',
    lookFor: '같은 파일을 여러 함수에서 readFileSync 반복',
  },
  {
    id: 'P2-11', category: 'performance', severity: 'P2',
    question: 'execSync가 불필요하게 동기 실행하는가?',
    lookFor: 'execSync(cmd) ← exec + await 가능한데 쓰레드 블로킹',
  },

  // 보안
  {
    id: 'P2-12', category: 'security', severity: 'P2',
    question: 'shell 명령에 사용자 입력을 직접 삽입하는가?',
    lookFor: 'execSync(`git commit -m "${userInput}"`) ← 이스케이프 안 됨',
    example: 'userInput에 "; rm -rf / 넣으면?',
  },
  {
    id: 'P2-13', category: 'security', severity: 'P2',
    question: '.env, .ssh, 비밀키 파일을 읽거나 출력하는가?',
    lookFor: 'readFileSync(.env) 결과를 console.log',
  },
  {
    id: 'P2-14', category: 'security', severity: 'P2',
    question: 'API 키가 로그/에러 메시지에 노출되는가?',
    lookFor: "console.log(config.keys) ← 키 원문 출력",
  },
  {
    id: 'P2-15', category: 'security', severity: 'P2',
    question: 'HMAC secret이 하드코딩 되어있는가?',
    lookFor: "const SECRET = 'hardcoded' ← 환경변수로 옮겨야",
  },
];

// ============================================================
// PART 5 — Full Checklist
// ============================================================

export const PRECISION_CHECKLIST: CheckItem[] = [...P0_CHECKS, ...P1_CHECKS, ...P2_CHECKS];

export function getChecklistBySeverity(severity: 'P0' | 'P1' | 'P2'): CheckItem[] {
  return PRECISION_CHECKLIST.filter(c => c.severity === severity);
}

export function getChecklistByCategory(category: string): CheckItem[] {
  return PRECISION_CHECKLIST.filter(c => c.category === category);
}

export function getChecklistStats(): { total: number; p0: number; p1: number; p2: number; categories: string[] } {
  const categories = [...new Set(PRECISION_CHECKLIST.map(c => c.category))];
  return {
    total: PRECISION_CHECKLIST.length,
    p0: P0_CHECKS.length,
    p1: P1_CHECKS.length,
    p2: P2_CHECKS.length,
    categories,
  };
}

// IDENTITY_SEAL: PART-5 | role=full-checklist | inputs=none | outputs=PRECISION_CHECKLIST

// ============================================================
// PART 6 — AI Prompt Builder (키 1개 정밀 타격)
// ============================================================

export function buildPrecisionReviewPrompt(code: string, fileName: string, mode: 'quick' | 'full' = 'full'): string {
  const checks = mode === 'quick' ? P0_CHECKS : PRECISION_CHECKLIST;

  const lines: string[] = [
    `You are CS Quill's precision code reviewer. Check the following code against ${checks.length} specific checklist items.`,
    '',
    'RULES:',
    '- For EACH checklist item, check if the code violates it.',
    '- Only report ACTUAL violations, not theoretical concerns.',
    '- Output JSON array of findings.',
    '- Be PRECISE: include exact line numbers.',
    '- Do NOT report style issues — only bugs and risks.',
    '',
    'CHECKLIST:',
  ];

  for (const check of checks) {
    lines.push(`[${check.id}] ${check.question}`);
    lines.push(`  Look for: ${check.lookFor}`);
    if (check.example) lines.push(`  Example: ${check.example}`);
  }

  lines.push('');
  lines.push('CODE:');
  lines.push('```');
  lines.push(code.slice(0, 8000));
  lines.push('```');
  lines.push('');
  lines.push('OUTPUT FORMAT (JSON only):');
  lines.push('[{"id":"P0-01","line":45,"message":"fileName used before declaration","severity":"P0","fix":"Move const fileName before line 45"}]');
  lines.push('');
  lines.push('If no violations found, output: []');

  return lines.join('\n');
}

// IDENTITY_SEAL: PART-6 | role=prompt-builder | inputs=code,fileName | outputs=prompt

// ============================================================
// PART 7 — Result Parser
// ============================================================

export interface PrecisionFinding {
  id: string;
  line: number;
  message: string;
  severity: 'P0' | 'P1' | 'P2';
  fix?: string;
}

export function parsePrecisionResult(raw: string): PrecisionFinding[] {
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((f: unknown): f is PrecisionFinding =>
      typeof f === 'object' && f !== null && 'id' in f && 'line' in f && 'message' in f,
    );
  } catch {
    return [];
  }
}

// IDENTITY_SEAL: PART-7 | role=parser | inputs=raw | outputs=PrecisionFinding[]

// ============================================================
// PART 8 — Single Key Runner
// ============================================================

export async function runPrecisionReview(
  code: string,
  fileName: string,
  mode: 'quick' | 'full' = 'full',
): Promise<PrecisionFinding[]> {
  const prompt = buildPrecisionReviewPrompt(code, fileName, mode);

  try {
    const { streamChat } = await import('../core/ai-bridge');
    const { getTemperature } = await import('../core/ai-config');

    let raw = '';
    await streamChat({
      systemInstruction: 'You are a precision code reviewer. Output ONLY a JSON array of findings. No explanation.',
      messages: [{ role: 'user', content: prompt }],
      onChunk: (t: string) => { raw += t; },
      temperature: getTemperature('verify'),
    });

    return parsePrecisionResult(raw);
  } catch {
    return [];
  }
}

// IDENTITY_SEAL: PART-8 | role=single-key-runner | inputs=code,fileName,mode | outputs=PrecisionFinding[]
