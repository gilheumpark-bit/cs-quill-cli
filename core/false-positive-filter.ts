// ============================================================
// CS Quill 🦔 — False Positive Filter (정수 필터 시스템)
// ============================================================
// AI 호출 전에 확정적 오탐을 먼저 걸러내는 다단계 필터.
// 물 정수 시스템처럼: 거친 필터 → 중간 필터 → 미세 필터 → AI 판정
//
// Stage 1: 환경 필터 (CLI에서 console.log는 정상)
// Stage 2: 문법 필터 (문자열/주석/정의 안의 패턴)
// Stage 3: 컨텍스트 필터 (테스트 mock, catch best-effort)
// Stage 4: 자기참조 필터 (검증 규칙 코드)
// Stage 5: AI 판정 (나머지만)

// ============================================================
// PART 1 — Types
// ============================================================

export interface FilteredFinding {
  ruleId: string;
  line: number;
  message: string;
  severity: string;
  confidence: string;
  evidence?: Array<{ engine: string; detail: string }>;
}

export interface SuppressEffectiveness {
  ruleId: string;
  suppressCount: number;
  overSuppressive: boolean; // true if this rule suppresses >50% of all findings
}

export interface FilterStatistics {
  stageCounts: { stage1: number; stage2: number; stage3: number; stage4: number; stage5: number; stage6: number };
  topSuppressors: SuppressEffectiveness[];
  topDismissedRules: Array<{ ruleId: string; count: number }>;
  fpValidation?: { sampleSize: number; confirmedFP: number; suspectedTP: number };
}

export interface FilterResult {
  kept: FilteredFinding[];
  dismissed: Array<FilteredFinding & { dismissReason: string; stage: number }>;
  stats: {
    total: number;
    stage1: number; // 환경 필터
    stage2: number; // 문법 필터
    stage3: number; // 컨텍스트 필터
    stage4: number; // 자기참조 필터
    stage5: number; // 양품 suppress-fp 필터
    stage6: number; // deduplication 필터
    kept: number;   // AI로 넘어가는 것
    boostDowngrades: number; // boost 신호로 confidence 하향 조정된 수
  };
  filterStatistics?: FilterStatistics;
}

// ============================================================
// PART 2 — 오탐 체크리스트 (확정적 규칙)
// ============================================================

interface FPRule {
  id: string;
  stage: 1 | 2 | 3 | 4;
  description: string;
  check: (finding: FilteredFinding, context: FilterContext) => boolean;
}

interface FilterContext {
  filePath: string;
  code: string;
  isCliTool: boolean;
  isTestFile: boolean;
  isRuleDefinition: boolean;
}

const FP_CHECKLIST: FPRule[] = [
  // ── Stage 1: 환경 필터 — "이 환경에서는 정상" ──
  {
    id: 'ENV-001',
    stage: 1,
    description: 'CLI 도구에서 console.log는 유일한 출력 수단',
    check: (f, ctx) => ctx.isCliTool && /console\.(log|debug|info|warn|error)/.test(f.message),
  },
  {
    id: 'ENV-002',
    stage: 1,
    description: 'CLI 도구에서 process.exit는 정상 종료 패턴',
    check: (f, _ctx) => /process\.exit/.test(f.message),
  },
  {
    id: 'ENV-003',
    stage: 1,
    description: 'Node.js에서 require()는 정상 모듈 로드',
    check: (f, _ctx) => /require\(/.test(f.message) && !/eval|Function/.test(f.message),
  },

  {
    id: 'ENV-004',
    stage: 1,
    description: 'Node.js에서 __dirname/__filename은 정상 전역',
    check: (f, _ctx) => /__dirname|__filename/.test(f.message),
  },
  {
    id: 'ENV-005',
    stage: 1,
    description: 'CLI에서 process.stdout/stderr는 정상 출력',
    check: (f, ctx) => ctx.isCliTool && /process\.(stdout|stderr)/.test(f.message),
  },
  {
    id: 'ENV-006',
    stage: 1,
    description: 'import.meta는 ESM 정상 문법',
    check: (f, _ctx) => /import\.meta/.test(f.message),
  },
  {
    id: 'ENV-007',
    stage: 1,
    description: 'CLI에서 throw new Error는 정상 종료 패턴',
    check: (f, ctx) => ctx.isCliTool && /throw\s+new\s+Error/.test(f.message),
  },

  // ── Stage 2: 문법 필터 — "코드가 아닌 텍스트" ──
  {
    id: 'SYN-001',
    stage: 2,
    description: '문자열 리터럴 안의 키워드 (소설 텍스트, UI 라벨 등)',
    check: (f, ctx) => {
      if (f.line <= 0) return false;
      const lines = ctx.code.split('\n');
      const line = lines[f.line - 1] ?? '';
      // finding이 가리키는 라인이 문자열 정의인지
      return /^\s*("|'|`)/.test(line.trim()) || /:\s*("|'|`)/.test(line);
    },
  },
  {
    id: 'SYN-002',
    stage: 2,
    description: '주석 안의 키워드',
    check: (f, ctx) => {
      if (f.line <= 0) return false;
      const lines = ctx.code.split('\n');
      const line = lines[f.line - 1] ?? '';
      return /^\s*\/\//.test(line) || /^\s*\*/.test(line);
    },
  },
  {
    id: 'SYN-003',
    stage: 2,
    description: 'CSS 값 (50%, translateX 등)',
    check: (f, _ctx) => /50%|translateX|gradient|linear-gradient/.test(f.message),
  },
  {
    id: 'SYN-004',
    stage: 2,
    description: '정규식 패턴 정의 안의 키워드',
    check: (f, ctx) => {
      if (f.line <= 0) return false;
      const lines = ctx.code.split('\n');
      const line = lines[f.line - 1] ?? '';
      return /regex\s*:|new RegExp|\/.*\/[gimsuy]/.test(line);
    },
  },

  // ── Stage 3: 컨텍스트 필터 — "의도적 패턴" ──
  {
    id: 'CTX-001',
    stage: 3,
    description: '.catch with recovery logic — only suppress if catch body has actual recovery (not empty catch)',
    check: (f, ctx) => {
      if (f.line <= 0) return false;
      const lines = ctx.code.split('\n');
      const line = lines[f.line - 1] ?? '';
      // Must have .catch pattern
      if (!/\.catch\s*\(/.test(line)) return false;
      // Read up to 5 lines after to check catch body content
      const catchBody = lines.slice(f.line - 1, Math.min(lines.length, f.line + 4)).join(' ');
      // Empty catch = NOT suppressed (this is a real issue)
      if (/\.catch\s*\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/.test(catchBody)) return false;
      // Has recovery logic: logging, fallback return, state reset, or re-throw
      const hasRecovery = /console\.(warn|error|log)|logger\.|log\.|fallback|default|return\s|setState|dispatch|retry|throw\s/.test(catchBody);
      return hasRecovery;
    },
  },
  {
    id: 'CTX-002',
    stage: 3,
    description: 'React createContext 기본값 — () => {} 는 placeholder',
    check: (f, ctx) => {
      if (f.line <= 0) return false;
      const lines = ctx.code.split('\n');
      const nearby = lines.slice(Math.max(0, f.line - 3), f.line + 1).join(' ');
      return /createContext/.test(nearby);
    },
  },
  {
    id: 'CTX-003',
    stage: 3,
    description: '테스트 mock — return null, empty body 의도적',
    check: (f, ctx) => ctx.isTestFile,
  },
  {
    id: 'CTX-004',
    stage: 3,
    description: 'useRef 초기값 — () => {} 는 placeholder',
    check: (f, ctx) => {
      if (f.line <= 0) return false;
      const lines = ctx.code.split('\n');
      const line = lines[f.line - 1] ?? '';
      return /useRef\s*[<(]/.test(line);
    },
  },
  {
    id: 'CTX-005',
    stage: 3,
    description: 'onChunk: () => {} — 스트림 콜백 의도적 no-op',
    check: (f, ctx) => {
      if (f.line <= 0) return false;
      const lines = ctx.code.split('\n');
      const line = lines[f.line - 1] ?? '';
      return /onChunk\s*:\s*\(\s*\)\s*=>/.test(line);
    },
  },

  {
    id: 'CTX-006',
    stage: 3,
    description: 'dynamic import() — 코드 스플리팅 정상 패턴',
    check: (f, ctx) => {
      if (f.line <= 0) return false;
      const lines = ctx.code.split('\n');
      const line = lines[f.line - 1] ?? '';
      return /import\(/.test(line) && !/eval/.test(line);
    },
  },
  {
    id: 'CTX-007',
    stage: 3,
    description: 'Promise.resolve/reject — 정상 비동기 패턴',
    check: (f, _ctx) => /Promise\.(resolve|reject)/.test(f.message),
  },
  {
    id: 'CTX-008',
    stage: 3,
    description: '빈 화살표 함수 콜백 () => {} — 의도적 no-op',
    check: (f, ctx) => {
      if (f.line <= 0) return false;
      const lines = ctx.code.split('\n');
      const line = lines[f.line - 1] ?? '';
      return /=>\s*\{\s*\}/.test(line) && (/\.then|\.catch|callback|handler|on[A-Z]/.test(line));
    },
  },
  {
    id: 'CTX-009',
    stage: 3,
    description: 'dispose/destroy/cleanup — 라이프사이클 no-op',
    check: (f, ctx) => {
      if (f.line <= 0) return false;
      const lines = ctx.code.split('\n');
      const line = lines[f.line - 1] ?? '';
      return /dispose|destroy|cleanup|teardown/.test(line);
    },
  },
  {
    id: 'CTX-010',
    stage: 3,
    description: 'loading: () => null — Next.js dynamic loading 패턴',
    check: (f, ctx) => {
      if (f.line <= 0) return false;
      const lines = ctx.code.split('\n');
      const line = lines[f.line - 1] ?? '';
      return /loading\s*:\s*\(\s*\)\s*=>\s*null/.test(line);
    },
  },
  {
    id: 'CTX-011',
    stage: 3,
    description: 'compensate: async () => {} — saga 의도적 no-op',
    check: (f, ctx) => {
      if (f.line <= 0) return false;
      const lines = ctx.code.split('\n');
      const line = lines[f.line - 1] ?? '';
      return /compensate/.test(line);
    },
  },

  // ── Stage 4: 자기참조 필터 — "검증 규칙 코드" ──
  {
    id: 'SELF-001',
    stage: 4,
    description: '검증 엔진 소스에서 규칙 문자열 자기참조 (패턴 매칭/정규식/규칙 ID)',
    check: (f, ctx) => {
      if (!ctx.isRuleDefinition) return false;
      // 규칙 코드에서 자기참조 오탐 발생 가능 패턴:
      // - 보안/위험 키워드가 정규식 안에 등장
      // - API hallucination이 규칙 코드 자체를 검사
      // - 규칙 ID(API-001 등)가 문자열에 등장
      const selfRefPatterns = /eval|security|xss|injection|secret|credential|password|hallucination|console\.log|process\.exit|API-\d{3}|규칙|위반.*의심/i;
      if (selfRefPatterns.test(f.message)) return true;
      // 규칙 정의 라인의 string literal/regex 안에서 발생한 finding
      if (f.line > 0) {
        const lines = ctx.code.split('\n');
        const line = lines[f.line - 1] ?? '';
        if (/^\s*("|'|`|\/\/)/.test(line.trim()) || /\.test\(|RegExp|ruleId/.test(line)) return true;
      }
      return false;
    },
  },
  {
    id: 'SELF-002',
    stage: 4,
    description: 'severity/confidence 정의 안의 키워드',
    check: (f, ctx) => {
      if (f.line <= 0) return false;
      const lines = ctx.code.split('\n');
      const line = lines[f.line - 1] ?? '';
      return /severity\s*:|confidence\s*:|FindingLevel|ruleId\s*:/.test(line);
    },
  },
];

// ============================================================
// PART 3 — Stage 5: Good Pattern Suppress-FP
// ============================================================

/**
 * 양품 패턴이 감지된 코드에서 관련 불량 findings의 confidence를 낮추거나 제거.
 * "타입 narrowing이 있으면 null dereference 오탐 가능성이 낮다"
 */
export function detectGoodPatterns(code: string): Set<string> {
  const detected = new Set<string>();

  // GQ-NL-010: 타입 narrowing → RTE-001,002,003 억제
  if (/!==\s*(null|undefined)|typeof\s+\w+\s*[!=]==/.test(code)) detected.add('GQ-NL-010');

  // GQ-TS-001: strict: true → TYP-012,013,014 억제
  // (tsconfig는 별도 체크이므로 파일 내 strict 관련 패턴만)

  // GQ-AS-005: try-catch-finally → ASY-003 억제
  if (/try\s*\{[\s\S]*?catch[\s\S]*?finally/.test(code)) detected.add('GQ-AS-005');

  // GQ-EH-003: catch에서 복구 또는 재throw → ERR-001,002 억제
  if (/catch\s*\([^)]*\)\s*\{[^}]*throw/.test(code)) detected.add('GQ-EH-003');

  // GQ-FN-004: Early return / Guard clause → CMX-007 억제
  if (/^\s*if\s*\([^)]*\)\s*(return|throw)\b/m.test(code)) detected.add('GQ-FN-004');

  // GQ-FN-009: const 우선 → VAR-008 억제
  const constCount = (code.match(/\bconst\b/g) || []).length;
  const letCount = (code.match(/\blet\b/g) || []).length;
  if (constCount > letCount * 3) detected.add('GQ-FN-009');

  // GQ-AS-002: Promise.all → ASY-002, PRF-004 억제
  if (/Promise\.all\s*\(/.test(code)) detected.add('GQ-AS-002');

  // GQ-SC-003: process.env 사용 → SEC-009 억제
  if (/process\.env\.\w+/.test(code) && !/sk-[a-zA-Z]{20}|AIza/.test(code)) detected.add('GQ-SC-003');

  // GQ-NL-007: JSON.parse try-catch → RTE-008 억제
  if (/try\s*\{[^}]*JSON\.parse/.test(code)) detected.add('GQ-NL-007');

  // GQ-TS-004: unknown 사용 → TYP-001 (any) 억제
  if (/:\s*unknown\b/.test(code) && !/:\s*any\b/.test(code)) detected.add('GQ-TS-004');

  // GQ-FN-010: 스프레드 불변 업데이트 → LOG-014, LOG-020 억제
  if (/\{\s*\.\.\./.test(code)) detected.add('GQ-FN-010');

  // GQ-FN-012: 원본 비변형 slice/concat → LOG-014 억제
  if (/\.slice\(|\.concat\(|\.map\(|\.filter\(/.test(code)) detected.add('GQ-FN-012');

  // GQ-NL-001: optional chaining → RTE-003 억제
  if (/\?\.\w/.test(code)) detected.add('GQ-NL-001');

  // GQ-NL-002: nullish coalescing → RTE-004 억제
  if (/\?\?/.test(code)) detected.add('GQ-NL-002');

  // GQ-NL-005: 구조분해 기본값 → RTE-007 억제
  if (/=\s*['"\d\[\{]/.test(code) && /const\s*\{/.test(code)) detected.add('GQ-NL-005');

  // GQ-AS-007: removeEventListener → ASY-009, PRF-006 억제
  if (/removeEventListener|\.off\(/.test(code)) detected.add('GQ-AS-007');

  // GQ-AS-008: clearTimeout → RES-003 억제
  if (/clearTimeout|clearInterval/.test(code)) detected.add('GQ-AS-008');

  // GQ-EH-001: 커스텀 Error 클래스 → ERR-005 억제
  if (/extends\s+Error/.test(code)) detected.add('GQ-EH-001');

  // GQ-SC-007: bcrypt/argon2 → SEC-011, SEC-012 억제
  if (/bcrypt|argon2|scrypt/.test(code)) detected.add('GQ-SC-007');

  // GQ-SC-009: zod/joi 검증 → SEC-001, SEC-002 억제
  if (/zod|Joi|z\.object|z\.string/.test(code)) detected.add('GQ-SC-009');

  // GQ-PF-005: debounce/throttle → PRF-009 억제
  if (/debounce|throttle/.test(code)) detected.add('GQ-PF-005');

  // GQ-PF-010: RegExp 루프 밖 정의 → PRF-008 억제
  if (/const\s+\w+\s*=\s*\//.test(code)) detected.add('GQ-PF-010');

  // GQ-RS-001: try-finally → RES-001, RES-002 억제
  if (/finally\s*\{/.test(code)) detected.add('GQ-RS-001');

  // GQ-CF-007: .env.example → CFG-010 억제
  if (/\.env\.example|process\.env/.test(code)) detected.add('GQ-CF-007');

  // GQ-EH-010: never exhaustive → CMX-012 억제
  if (/:\s*never\b|assertNever/.test(code)) detected.add('GQ-EH-010');

  // ── 5대 양품 마스터 패턴 ──
  // 패턴1: HashMap 최적화 → PRF-002 억제
  if (/new\s+Map\(|new\s+Set\(|\.has\(/.test(code)) detected.add('GQ-PF-002');

  // 패턴2: Dictionary Dispatch → CMX-012 억제
  if (/Record<.*,.*>\s*=\s*\{/.test(code)) detected.add('GQ-SL-006');

  // 패턴3: Promise.allSettled → ASY-002 억제
  if (/Promise\.allSettled/.test(code)) detected.add('GQ-AS-003');

  // 패턴4: exhaustive never check → CMX-012 억제
  if (/const\s+_\w*:\s*never\s*=/.test(code)) detected.add('GQ-FP-004');

  // 패턴5: 선언적 파이프라인 → PRF-002 억제
  if (/\.filter\([^)]+\)\s*\.\s*map\(|\.map\([^)]+\)\s*\.\s*filter\(/.test(code)) detected.add('GQ-FN-008');

  // ================================================================
  // boost 패턴 (신규 — quality 차원 건전성 증명)
  // suppress-fp와 달리 특정 ruleId를 dismiss하지 않고,
  // 같은 quality 차원의 findings confidence를 하향 조정.
  // ================================================================

  // ── Reliability boosts ──
  // GQ-TS-001: strict: true in tsconfig → Reliability
  if (/"strict"\s*:\s*true|compilerOptions[\s\S]{0,200}strict/.test(code)) detected.add('GQ-TS-001');
  // GQ-TS-003: 파라미터 타입 완전 명시 → Reliability
  if (/function\s+\w+\s*\([^)]*:\s*\w+/.test(code)) detected.add('GQ-TS-003');
  // GQ-TS-005: readonly 수정자 → Reliability
  if (/\breadonly\b/.test(code)) detected.add('GQ-TS-005');
  // GQ-TS-009: 타입 가드 is 접두사 → Reliability
  if (/\):\s*\w+\s+is\s+\w+/.test(code)) detected.add('GQ-TS-009');
  // GQ-TS-010: discriminated union → Reliability
  if (/type\s*=\s*['"]|kind\s*:\s*['"]|tag\s*:\s*['"]/.test(code)) detected.add('GQ-TS-010');
  // GQ-FN-006: 파라미터 기본값 → Reliability
  if (/\(\s*\w+\s*:\s*\w+\s*=\s*[^,)]+/.test(code)) detected.add('GQ-FN-006');
  // GQ-NL-004: 배열 length 확인 → Reliability
  if (/\.length\s*[><=!]==?\s*\d|\.length\s*\)/.test(code)) detected.add('GQ-NL-004');
  // GQ-NL-006: Array.isArray → Reliability
  if (/Array\.isArray/.test(code)) detected.add('GQ-NL-006');
  // GQ-NL-008: Number.isNaN → Reliability
  if (/Number\.isNaN/.test(code)) detected.add('GQ-NL-008');
  // GQ-AS-004: AbortController → Reliability
  if (/AbortController|AbortSignal|\.abort\(/.test(code)) detected.add('GQ-AS-004');
  // GQ-AS-009: Promise.race timeout → Reliability
  if (/Promise\.race/.test(code)) detected.add('GQ-AS-009');
  // GQ-AS-010: retry exponential backoff → Reliability
  if (/retry|backoff|exponential/i.test(code)) detected.add('GQ-AS-010');
  // GQ-EH-002: instanceof 에러 타입 구분 → Reliability
  if (/instanceof\s+\w*Error/.test(code)) detected.add('GQ-EH-002');
  // GQ-EH-006: Result 타입 패턴 → Reliability
  if (/Result<|Either<|Ok\(|Err\(|isOk|isErr/.test(code)) detected.add('GQ-EH-006');
  // GQ-NW-006: Array.at(-1) → Reliability
  if (/\.at\(\s*-?\d+\s*\)/.test(code)) detected.add('GQ-NW-006');
  // GQ-NW-010: noUncheckedIndexedAccess → Reliability
  if (/noUncheckedIndexedAccess/.test(code)) detected.add('GQ-NW-010');
  // GQ-CF-001: strict: true in config → Reliability
  if (/"strict"\s*:\s*true/.test(code)) detected.add('GQ-CF-001');

  // ── Maintainability boosts ──
  // GQ-NM-002: boolean is/has/can/should 접두사
  if (/\b(is|has|can|should|was|will)[A-Z]\w*\s*[=:(]/.test(code)) detected.add('GQ-NM-002');
  // GQ-NM-003: 상수 UPPER_SNAKE_CASE
  if (/const\s+[A-Z][A-Z_\d]{2,}\s*=/.test(code)) detected.add('GQ-NM-003');
  // GQ-NM-008: 함수명 동사 시작
  if (/function\s+(get|set|create|update|delete|fetch|handle|process|validate|check|parse|format|build|init|load|save|send|compute|render|transform)\w+/.test(code)) detected.add('GQ-NM-008');
  // GQ-NM-011: 이벤트 핸들러 on/handle 접두사
  if (/\b(on|handle)[A-Z]\w*\s*[=(]/.test(code)) detected.add('GQ-NM-011');
  // GQ-TS-002: 명시적 반환 타입
  if (/\)\s*:\s*(string|number|boolean|void|Promise<|Array<|\w+\[\]|Record<|\{)/.test(code)) detected.add('GQ-TS-002');
  // GQ-TS-007: Pick/Omit/Partial/Required 유틸리티 타입
  if (/\b(Pick|Omit|Partial|Required|Extract|Exclude)</.test(code)) detected.add('GQ-TS-007');
  // GQ-FN-005: 파라미터 객체화 options
  if (/\boptions\s*[?]?:\s*\{|\bopts\s*[?]?:\s*\{|\bconfig\s*[?]?:\s*\{/.test(code)) detected.add('GQ-FN-005');
  // GQ-SL-004: 전략 패턴
  if (/strategies\s*[=:]|strategy\s*[=:]|Strategy</.test(code)) detected.add('GQ-SL-004');
  // GQ-DP-001: Factory 함수 createXxx
  if (/function\s+create[A-Z]\w+|const\s+create[A-Z]\w+\s*=/.test(code)) detected.add('GQ-DP-001');
  // GQ-DP-009: Observer EventEmitter
  if (/EventEmitter|\.emit\(/.test(code)) detected.add('GQ-DP-009');
  // GQ-NW-004: import type 분리
  if (/import\s+type\s+\{/.test(code)) detected.add('GQ-NW-004');
  // GQ-DC-001: JSDoc public API
  if (/\/\*\*[\s\S]*?@(param|returns|throws|example)/.test(code)) detected.add('GQ-DC-001');
  // GQ-DC-005: TODO 이슈 번호 포함
  if (/TODO\s*[\[(#]\s*\d+|FIXME\s*[\[(#]\s*\d+/.test(code)) detected.add('GQ-DC-005');

  // ── Performance boosts ──
  // GQ-PF-003: DocumentFragment
  if (/DocumentFragment|createDocumentFragment/.test(code)) detected.add('GQ-PF-003');
  // GQ-PF-004: requestAnimationFrame
  if (/requestAnimationFrame/.test(code)) detected.add('GQ-PF-004');
  // GQ-PF-006: Lazy loading dynamic import
  if (/import\(\s*['"`]|React\.lazy/.test(code)) detected.add('GQ-PF-006');
  // GQ-PF-007: 캐시 TTL+size limit
  if (/\bcache\b.*\b(ttl|maxSize|max_size|expire|maxAge)/i.test(code) || /\bLRU\b|lru-cache/.test(code)) detected.add('GQ-PF-007');
  // GQ-PF-009: IntersectionObserver
  if (/IntersectionObserver/.test(code)) detected.add('GQ-PF-009');
  // GQ-FN-013: useMemo/useCallback
  if (/\buseMemo\b|\buseCallback\b/.test(code)) detected.add('GQ-FN-013');

  // ── Security boosts ──
  // GQ-SC-001: 파라미터화 쿼리/ORM
  if (/\$\d+|\.query\s*\(\s*['"`][^'"]*\$|\bprisma\b|\btypeorm\b|\bsequelize\b|\bknex\b/.test(code)) detected.add('GQ-SC-001');
  // GQ-SC-002: DOMPurify/escaping
  if (/DOMPurify|sanitize|escape[Hh]tml|xss/.test(code)) detected.add('GQ-SC-002');
  // GQ-SC-004: httpOnly secure sameSite
  if (/httpOnly|sameSite|secure\s*:\s*true/.test(code)) detected.add('GQ-SC-004');
  // GQ-SC-005: CORS 특정 origin
  if (/cors\s*\(\s*\{[\s\S]{0,100}?origin/.test(code)) detected.add('GQ-SC-005');
  // GQ-SC-006: Helmet 보안 헤더
  if (/helmet\(|require\(['"]helmet['"]\)|from\s+['"]helmet['"]/.test(code)) detected.add('GQ-SC-006');
  // GQ-SC-008: JWT 만료 검증
  if (/expiresIn|jwt\.verify/.test(code)) detected.add('GQ-SC-008');
  // GQ-SC-012: CSRF 토큰 검증
  if (/csrf|csurf|_token|xsrf/i.test(code)) detected.add('GQ-SC-012');
  // GQ-OB-008: 민감 정보 로그 마스킹
  if (/mask|redact|sanitize.*log|scrub/i.test(code)) detected.add('GQ-OB-008');

  return detected;
}

/** 양품→불량 억제 매핑 */
export const SUPPRESS_MAP: Record<string, string[]> = {
  'GQ-NL-010': ['RTE-001', 'RTE-002', 'RTE-003'],
  'GQ-AS-005': ['ASY-003', 'ERR-010'],
  'GQ-EH-003': ['ERR-001', 'ERR-002'],
  'GQ-FN-004': ['CMX-007'],
  'GQ-FN-009': ['VAR-008'],
  'GQ-AS-002': ['ASY-002', 'PRF-004'],
  'GQ-SC-003': ['SEC-009', 'SEC-010'],
  'GQ-NL-007': ['RTE-008'],
  'GQ-TS-004': ['TYP-001'],
  'GQ-FN-010': ['LOG-014', 'LOG-020'],
  'GQ-FN-012': ['LOG-014'],
  'GQ-NL-001': ['RTE-003'],
  'GQ-NL-002': ['RTE-004'],
  'GQ-NL-005': ['RTE-007'],
  'GQ-AS-007': ['ASY-009', 'PRF-006'],
  'GQ-AS-008': ['RES-003'],
  'GQ-EH-001': ['ERR-005'],
  'GQ-SC-007': ['SEC-011', 'SEC-012'],
  'GQ-SC-009': ['SEC-001', 'SEC-002'],
  'GQ-PF-005': ['PRF-009'],
  'GQ-PF-010': ['PRF-008'],
  'GQ-RS-001': ['RES-001', 'RES-002'],
  'GQ-CF-007': ['CFG-010'],
  'GQ-EH-010': ['CMX-012'],
  // 5대 양품 마스터 패턴
  'GQ-PF-002': ['PRF-002', 'PRF-007'],
  'GQ-SL-006': ['CMX-012'],
  'GQ-AS-003': ['ASY-002'],
  'GQ-FP-004': ['CMX-012', 'RTE-017'],
  'GQ-FN-008': ['PRF-002', 'LOG-012'],
  // G17~G20 추가
  'GQ-AR-005': ['CFG-007'],
  'GQ-OB-008': ['SEC-018'],
  'GQ-NW-006': ['RTE-005', 'RTE-006'],
  'GQ-NW-007': ['PRF-003'],
  'GQ-NW-010': ['RTE-005', 'RTE-006'],
};

// ============================================================
// PART 3b — Boost Signal Infrastructure
// ============================================================

type IsoQuality = 'Maintainability' | 'Reliability' | 'Security' | 'Performance';

/**
 * 불량 ruleId prefix -> ISO 25010 quality 차원 매핑.
 * boost 패턴이 같은 quality 차원에서 감지되면 해당 finding의 confidence를 하향 조정.
 */
const RULE_PREFIX_TO_QUALITY: Record<string, IsoQuality> = {
  // Reliability: 런타임 오류, 타입, 비동기, 에러 처리, 리소스
  'RTE': 'Reliability', 'TYP': 'Reliability', 'ASY': 'Reliability',
  'ERR': 'Reliability', 'RES': 'Reliability', 'CFG': 'Reliability', 'TST': 'Reliability',
  // Maintainability: 복잡도, 로직, 변수, 스타일
  'CMX': 'Maintainability', 'LOG': 'Maintainability', 'VAR': 'Maintainability',
  'STL': 'Maintainability', 'AIP': 'Maintainability',
  // Security
  'SEC': 'Security',
  // Performance
  'PRF': 'Performance',
};

/**
 * 양품 패턴 ID -> 해당 패턴이 증명하는 quality 차원.
 * good-pattern-catalog.ts의 quality 필드와 일치.
 */
const BOOST_QUALITY_MAP: Record<string, IsoQuality> = {
  // Reliability boosts
  'GQ-TS-001': 'Reliability', 'GQ-TS-003': 'Reliability', 'GQ-TS-004': 'Reliability',
  'GQ-TS-005': 'Reliability', 'GQ-TS-009': 'Reliability', 'GQ-TS-010': 'Reliability',
  'GQ-FN-006': 'Reliability', 'GQ-FN-009': 'Reliability', 'GQ-FN-010': 'Reliability',
  'GQ-FN-012': 'Reliability',
  'GQ-NL-001': 'Reliability', 'GQ-NL-002': 'Reliability', 'GQ-NL-004': 'Reliability',
  'GQ-NL-005': 'Reliability', 'GQ-NL-006': 'Reliability', 'GQ-NL-007': 'Reliability',
  'GQ-NL-008': 'Reliability', 'GQ-NL-010': 'Reliability',
  'GQ-AS-003': 'Reliability', 'GQ-AS-004': 'Reliability', 'GQ-AS-005': 'Reliability',
  'GQ-AS-009': 'Reliability', 'GQ-AS-010': 'Reliability',
  'GQ-EH-001': 'Reliability', 'GQ-EH-002': 'Reliability', 'GQ-EH-003': 'Reliability',
  'GQ-EH-006': 'Reliability', 'GQ-EH-010': 'Reliability',
  'GQ-RS-001': 'Reliability', 'GQ-FP-004': 'Reliability',
  'GQ-NW-006': 'Reliability', 'GQ-NW-010': 'Reliability', 'GQ-CF-001': 'Reliability',
  // Maintainability boosts
  'GQ-NM-002': 'Maintainability', 'GQ-NM-003': 'Maintainability', 'GQ-NM-008': 'Maintainability',
  'GQ-NM-011': 'Maintainability',
  'GQ-TS-002': 'Maintainability', 'GQ-TS-007': 'Maintainability',
  'GQ-FN-004': 'Maintainability', 'GQ-FN-005': 'Maintainability', 'GQ-FN-008': 'Maintainability',
  'GQ-SL-004': 'Maintainability', 'GQ-SL-006': 'Maintainability',
  'GQ-DP-001': 'Maintainability', 'GQ-DP-009': 'Maintainability',
  'GQ-NW-004': 'Maintainability',
  'GQ-DC-001': 'Maintainability', 'GQ-DC-005': 'Maintainability', 'GQ-CF-007': 'Maintainability',
  // Performance boosts
  'GQ-AS-002': 'Performance', 'GQ-PF-002': 'Performance', 'GQ-PF-003': 'Performance',
  'GQ-PF-004': 'Performance', 'GQ-PF-005': 'Performance', 'GQ-PF-006': 'Performance',
  'GQ-PF-007': 'Performance', 'GQ-PF-009': 'Performance', 'GQ-PF-010': 'Performance',
  'GQ-FN-013': 'Performance',
  // Security boosts
  'GQ-SC-001': 'Security', 'GQ-SC-002': 'Security', 'GQ-SC-003': 'Security',
  'GQ-SC-004': 'Security', 'GQ-SC-005': 'Security', 'GQ-SC-006': 'Security',
  'GQ-SC-007': 'Security', 'GQ-SC-008': 'Security', 'GQ-SC-009': 'Security',
  'GQ-SC-012': 'Security', 'GQ-OB-008': 'Security',
};

/**
 * 감지된 양품 패턴에서 boost 신호가 활성화된 quality 차원 세트를 계산.
 * 한 차원에서 2개 이상의 boost 패턴이 감지되면 해당 차원이 "건전하다"고 판단.
 */
function computeBoostedQualities(detectedPatterns: Set<string>): Set<IsoQuality> {
  const qualityCounts: Record<IsoQuality, number> = {
    'Maintainability': 0, 'Reliability': 0, 'Security': 0, 'Performance': 0,
  };
  detectedPatterns.forEach(function(patternId) {
    const quality = BOOST_QUALITY_MAP[patternId];
    if (quality) qualityCounts[quality]++;
  });
  const boosted = new Set<IsoQuality>();
  for (const [quality, count] of Object.entries(qualityCounts)) {
    if (count >= 2) boosted.add(quality as IsoQuality);
  }
  return boosted;
}

/** ruleId prefix -> quality 차원 (예: 'RTE-001' -> 'Reliability') */
function getRuleQuality(ruleId: string): IsoQuality | undefined {
  const prefix = ruleId.replace(/-\d+$/, '');
  return RULE_PREFIX_TO_QUALITY[prefix];
}

/** confidence를 1단계 하향 (high->medium, medium->low, low 유지) */
function downgradeConfidence(confidence: string): string {
  if (confidence === 'high') return 'medium';
  if (confidence === 'medium') return 'low';
  return confidence;
}

// ============================================================
// PART 4 — Context Builder + Line-Level Context
// ============================================================

function buildContext(filePath: string, code: string): FilterContext {
  const isCliTool = /commands\/|bin\/|core\/|adapters\/|daemon|formatters\/|tui\//.test(filePath);
  const isTestFile = /test|spec|__tests__|\.test\.|\.spec\./.test(filePath);
  const isRuleDefinition = /pipeline-bridge|ast-bridge|ast-engine|deep-verify|quill-engine|verify-orchestrator|cross-judge|team-lead|rule-catalog|good-pattern|false-positive/.test(filePath);

  return { filePath, code, isCliTool, isTestFile, isRuleDefinition };
}

/**
 * Read ±3 lines around a finding for line-level context judgment.
 * Returns the surrounding code snippet for more accurate FP detection.
 */
function getLineContext(code: string, line: number, range: number = 3): string {
  if (line <= 0) return '';
  const lines = code.split('\n');
  const start = Math.max(0, line - 1 - range);
  const end = Math.min(lines.length, line + range);
  return lines.slice(start, end).join('\n');
}

// ── Known FP / known TP patterns for spot-check validation ──
const KNOWN_FP_PATTERNS: Array<{ ruleId: string; contextPattern: RegExp }> = [
  { ruleId: 'SEC-006', contextPattern: /regex\s*:|\/.*\/[gimsuy]*\s*,|severity\s*:/ }, // eval in rule def
  { ruleId: 'API-006', contextPattern: /^\s*\/\// },  // console.log in comments
  { ruleId: 'TYP-001', contextPattern: /['"`].*any.*['"`]/ },  // 'any' in string literal
];
const KNOWN_TP_PATTERNS: Array<{ ruleId: string; contextPattern: RegExp }> = [
  { ruleId: 'SEC-006', contextPattern: /eval\s*\(\s*\w+/ },  // eval with dynamic arg
  { ruleId: 'SEC-009', contextPattern: /password\s*=\s*['"`][^'"]+['"`]/ },  // hardcoded pw
];

// ============================================================
// PART 4b — Filter Runner
// ============================================================

export function runFalsePositiveFilter(
  findings: FilteredFinding[],
  filePath: string,
  code: string,
): FilterResult {
  const context = buildContext(filePath, code);
  const kept: FilteredFinding[] = [];
  const dismissed: FilterResult['dismissed'] = [];
  const stats = {
    total: findings.length,
    stage1: 0, stage2: 0, stage3: 0, stage4: 0, stage5: 0, stage6: 0,
    kept: 0, boostDowngrades: 0,
  };

  // ── Suppress effectiveness tracking ──
  const suppressCounts = new Map<string, number>(); // ruleId/goodId → count
  const dismissedByRule = new Map<string, number>(); // FP rule id → count

  // Stage 5a: 양품 패턴 감지 → suppress-fp (dismiss)
  const goodPatterns = detectGoodPatterns(code);
  const suppressedRuleIds = new Set<string>();
  const suppressOrigin = new Map<string, string>(); // badId → goodId
  for (const [goodId, badIds] of Object.entries(SUPPRESS_MAP)) {
    if (goodPatterns.has(goodId)) {
      for (const badId of badIds) {
        suppressedRuleIds.add(badId);
        suppressOrigin.set(badId, goodId);
      }
    }
  }

  // Stage 5b: boost 신호 → 건전한 quality 차원 계산
  const boostedQualities = computeBoostedQualities(goodPatterns);

  for (const finding of findings) {
    let isDismissed = false;

    // Stage 5a: 양품 패턴이 억제하는 ruleId (suppress-fp)
    if (finding.ruleId && suppressedRuleIds.has(finding.ruleId)) {
      const originGood = suppressOrigin.get(finding.ruleId) ?? 'unknown';
      dismissed.push({ ...finding, dismissReason: `[GOOD-SUPPRESS] 양품 패턴(${originGood})이 존재하여 오탐 가능성 낮음`, stage: 5 });
      stats.stage5++;
      suppressCounts.set(originGood, (suppressCounts.get(originGood) ?? 0) + 1);
      isDismissed = true;
    }

    if (!isDismissed) for (const rule of FP_CHECKLIST) {
      // Enhanced: use line-level context for more accurate judgment
      const lineCtx = getLineContext(code, finding.line, 3);
      const findingWithContext = { ...finding, _lineContext: lineCtx };
      if (rule.check(findingWithContext, context)) {
        dismissed.push({ ...finding, dismissReason: `[${rule.id}] ${rule.description}`, stage: rule.stage });
        dismissedByRule.set(rule.id, (dismissedByRule.get(rule.id) ?? 0) + 1);
        if (rule.stage === 1) stats.stage1++;
        else if (rule.stage === 2) stats.stage2++;
        else if (rule.stage === 3) stats.stage3++;
        else stats.stage4++;
        isDismissed = true;
        break; // 첫 매칭 규칙으로 충분
      }
    }

    if (!isDismissed) {
      // 카탈로그 정책: hint 등급 규칙은 confidence를 low로 하향
      try {
        const { getRule } = require('./rule-catalog');
        if (finding.ruleId) {
          const rule = getRule(finding.ruleId);
          if (rule?.defaultAction === 'hint') {
            finding.confidence = 'low';
            finding.severity = rule.severity === 'info' ? 'info' : finding.severity;
          }
        }
      } catch { /* 카탈로그 없으면 skip */ }

      // Stage 5b: boost confidence 하향 — 같은 quality 차원에 boost 패턴이 있으면
      // confidence를 1단계 낮춤 (코드베이스가 해당 영역에서 건전성을 보이므로)
      if (finding.ruleId && boostedQualities.size > 0) {
        const findingQuality = getRuleQuality(finding.ruleId);
        if (findingQuality && boostedQualities.has(findingQuality)) {
          const before = finding.confidence;
          finding.confidence = downgradeConfidence(finding.confidence);
          if (before !== finding.confidence) {
            stats.boostDowngrades++;
            if (!finding.evidence) finding.evidence = [];
            finding.evidence.push({
              engine: 'boost-signal',
              detail: `[BOOST] ${findingQuality} 차원 양품 패턴 감지 → confidence ${before}->${finding.confidence}`,
            });
          }
        }
      }

      kept.push(finding);
    }
  }

  // ── Stage 6: Deduplication — same message at same line from different engines = merge ──
  const dedupMap = new Map<string, FilteredFinding>();
  const deduped: FilteredFinding[] = [];
  for (const f of kept) {
    const key = `${f.line}:${f.message}`;
    const existing = dedupMap.get(key);
    if (existing) {
      // Merge: keep higher severity, accumulate evidence
      stats.stage6++;
      const sevOrder = ['critical', 'error', 'warning', 'info'];
      if (sevOrder.indexOf(f.severity) < sevOrder.indexOf(existing.severity)) {
        existing.severity = f.severity;
      }
      // Merge confidence: keep the higher one
      const confOrder = ['high', 'medium', 'low'];
      if (confOrder.indexOf(f.confidence) < confOrder.indexOf(existing.confidence)) {
        existing.confidence = f.confidence;
      }
      // Accumulate evidence
      if (f.evidence) {
        if (!existing.evidence) existing.evidence = [];
        existing.evidence.push(...f.evidence);
      }
      if (!existing.evidence) existing.evidence = [];
      existing.evidence.push({ engine: 'dedup-merge', detail: `merged from ruleId=${f.ruleId}` });
    } else {
      dedupMap.set(key, f);
      deduped.push(f);
    }
  }

  // ── Build filter statistics ──
  const topSuppressors: SuppressEffectiveness[] = [];
  Array.from(suppressCounts.entries()).forEach(function(entry) {
    topSuppressors.push({
      ruleId: entry[0],
      suppressCount: entry[1],
      overSuppressive: entry[1] > findings.length * 0.5, // >50% = over-suppressive
    });
  });
  topSuppressors.sort(function(a, b) { return b.suppressCount - a.suppressCount; });

  const topDismissedRules: Array<{ ruleId: string; count: number }> = [];
  Array.from(dismissedByRule.entries()).forEach(function(entry) {
    topDismissedRules.push({ ruleId: entry[0], count: entry[1] });
  });
  topDismissedRules.sort(function(a, b) { return b.count - a.count; });

  // ── FP Validation: spot-check sample of dismissed findings against known-good/bad list ──
  let fpValidation: FilterStatistics['fpValidation'] = undefined;
  if (dismissed.length > 0) {
    const sampleSize = Math.min(dismissed.length, 10);
    const sample = dismissed.slice(0, sampleSize);
    let confirmedFP = 0;
    let suspectedTP = 0;
    for (const d of sample) {
      const lineCtx = getLineContext(code, d.line, 3);
      // Check against known FP patterns
      const isFP = KNOWN_FP_PATTERNS.some(p => p.ruleId === d.ruleId && p.contextPattern.test(lineCtx));
      // Check against known TP patterns
      const isTP = KNOWN_TP_PATTERNS.some(p => p.ruleId === d.ruleId && p.contextPattern.test(lineCtx));
      if (isFP) confirmedFP++;
      if (isTP) suspectedTP++;
    }
    fpValidation = { sampleSize, confirmedFP, suspectedTP };
  }

  const filterStatistics: FilterStatistics = {
    stageCounts: {
      stage1: stats.stage1, stage2: stats.stage2, stage3: stats.stage3,
      stage4: stats.stage4, stage5: stats.stage5, stage6: stats.stage6,
    },
    topSuppressors: topSuppressors.slice(0, 5),
    topDismissedRules: topDismissedRules.slice(0, 5),
    fpValidation,
  };

  stats.kept = deduped.length;
  return { kept: deduped, dismissed, stats, filterStatistics };
}

// ============================================================
// PART 5 — Summary Printer
// ============================================================

export function printFilterSummary(result: FilterResult): string {
  const lines = [
    `  정수 필터: ${result.stats.total}건 → ${result.stats.kept}건 (${result.stats.total - result.stats.kept}건 제거)`,
  ];

  if (result.stats.stage1 > 0) lines.push(`    Stage 1 환경: ${result.stats.stage1}건 (CLI console.log 등)`);
  if (result.stats.stage2 > 0) lines.push(`    Stage 2 문법: ${result.stats.stage2}건 (문자열/주석/CSS)`);
  if (result.stats.stage3 > 0) lines.push(`    Stage 3 컨텍스트: ${result.stats.stage3}건 (catch/mock/useRef)`);
  if (result.stats.stage4 > 0) lines.push(`    Stage 4 자기참조: ${result.stats.stage4}건 (규칙 코드)`);
  if (result.stats.stage5 > 0) lines.push(`    Stage 5a suppress: ${result.stats.stage5}건 (양품 패턴 억제)`);
  if (result.stats.boostDowngrades > 0) lines.push(`    Stage 5b boost: ${result.stats.boostDowngrades}건 confidence 하향 (양품 차원 건전성)`);
  if (result.stats.stage6 > 0) lines.push(`    Stage 6 dedup: ${result.stats.stage6}건 (중복 병합)`);

  // Suppress effectiveness warnings
  if (result.filterStatistics) {
    const overSuppressive = result.filterStatistics.topSuppressors.filter(s => s.overSuppressive);
    if (overSuppressive.length > 0) {
      lines.push(`    [WARN] 과다 억제 규칙: ${overSuppressive.map(s => `${s.ruleId}(${s.suppressCount}건)`).join(', ')}`);
    }
    // FP validation results
    if (result.filterStatistics.fpValidation && result.filterStatistics.fpValidation.suspectedTP > 0) {
      const v = result.filterStatistics.fpValidation;
      lines.push(`    [WARN] FP 검증: ${v.sampleSize}건 샘플 중 ${v.suspectedTP}건이 실제 양성(TP) 의심`);
    }
  }

  return lines.join('\n');
}

/**
 * Export filter statistics for external analysis.
 * Provides stage-by-stage counts, top suppressors, top dismissed rules,
 * and FP validation results.
 */
export function exportFilterStatistics(result: FilterResult): FilterStatistics | undefined {
  return result.filterStatistics;
}

// IDENTITY_SEAL: PART-5 | role=fp-filter | inputs=findings,filePath,code | outputs=FilterResult
