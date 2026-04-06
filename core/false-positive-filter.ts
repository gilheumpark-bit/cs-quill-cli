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

export interface FilterResult {
  kept: FilteredFinding[];
  dismissed: Array<FilteredFinding & { dismissReason: string; stage: number }>;
  stats: {
    total: number;
    stage1: number; // 환경 필터
    stage2: number; // 문법 필터
    stage3: number; // 컨텍스트 필터
    stage4: number; // 자기참조 필터
    kept: number;   // AI로 넘어가는 것
  };
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
    description: '.catch(() => {}) — 의도적 best-effort 에러 무시',
    check: (f, ctx) => {
      if (f.line <= 0) return false;
      const lines = ctx.code.split('\n');
      const line = lines[f.line - 1] ?? '';
      return /\.catch\s*\(\s*\(\s*\)\s*=>\s*\{/.test(line) || /\.catch\s*\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/.test(line);
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

  // ── Stage 4: 자기참조 필터 — "검증 규칙 코드" ──
  {
    id: 'SELF-001',
    stage: 4,
    description: '검증 엔진 소스에서 eval/security 등 규칙 문자열',
    check: (f, ctx) => ctx.isRuleDefinition,
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
function detectGoodPatterns(code: string): Set<string> {
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

  return detected;
}

/** 양품→불량 억제 매핑 (good-pattern-catalog의 suppresses와 동일) */
const SUPPRESS_MAP: Record<string, string[]> = {
  'GQ-NL-010': ['RTE-001', 'RTE-002', 'RTE-003'],
  'GQ-AS-005': ['ASY-003', 'ERR-010'],
  'GQ-EH-003': ['ERR-001', 'ERR-002'],
  'GQ-FN-004': ['CMX-007'],
  'GQ-FN-009': ['VAR-008'],
  'GQ-AS-002': ['ASY-002', 'PRF-004'],
  'GQ-SC-003': ['SEC-009', 'SEC-010'],
  'GQ-NL-007': ['RTE-008'],
};

// ============================================================
// PART 4 — Context Builder
// ============================================================

function buildContext(filePath: string, code: string): FilterContext {
  const isCliTool = /commands\/|bin\/|core\/|adapters\/|daemon|formatters\/|tui\//.test(filePath);
  const isTestFile = /test|spec|__tests__|\.test\.|\.spec\./.test(filePath);
  const isRuleDefinition = /pipeline-bridge|ast-bridge|ast-engine|deep-verify|quill-engine|verify-orchestrator|cross-judge|team-lead|rule-catalog|good-pattern|false-positive/.test(filePath);

  return { filePath, code, isCliTool, isTestFile, isRuleDefinition };
}

// ============================================================
// PART 4 — Filter Runner
// ============================================================

export function runFalsePositiveFilter(
  findings: FilteredFinding[],
  filePath: string,
  code: string,
): FilterResult {
  const context = buildContext(filePath, code);
  const kept: FilteredFinding[] = [];
  const dismissed: FilterResult['dismissed'] = [];
  const stats = { total: findings.length, stage1: 0, stage2: 0, stage3: 0, stage4: 0, kept: 0 };

  // Stage 5: 양품 패턴 감지 → suppress-fp
  const goodPatterns = detectGoodPatterns(code);
  const suppressedRuleIds = new Set<string>();
  for (const [goodId, badIds] of Object.entries(SUPPRESS_MAP)) {
    if (goodPatterns.has(goodId)) {
      for (const badId of badIds) suppressedRuleIds.add(badId);
    }
  }

  for (const finding of findings) {
    let isDismissed = false;

    // Stage 5: 양품 패턴이 억제하는 ruleId
    if (finding.ruleId && suppressedRuleIds.has(finding.ruleId)) {
      dismissed.push({ ...finding, dismissReason: `[GOOD-SUPPRESS] 양품 패턴이 존재하여 오탐 가능성 낮음`, stage: 5 as any });
      stats.stage4++; // stage5는 stats에 없으니 stage4에 합산
      isDismissed = true;
    }

    if (!isDismissed) for (const rule of FP_CHECKLIST) {
      if (rule.check(finding, context)) {
        dismissed.push({ ...finding, dismissReason: `[${rule.id}] ${rule.description}`, stage: rule.stage });
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
      kept.push(finding);
    }
  }

  stats.kept = kept.length;
  return { kept, dismissed, stats };
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

  return lines.join('\n');
}

// IDENTITY_SEAL: PART-5 | role=fp-filter | inputs=findings,filePath,code | outputs=FilterResult
