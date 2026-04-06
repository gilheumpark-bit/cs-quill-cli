// ============================================================
// CS Quill 🦔 — Cross-Model Judge (Independent Arbiter)
// ============================================================
// 생성 모델과 검증 모델의 결과를 독립적으로 판단하는 심판.
// 다른 모델이 크로스체크해서 오탐/정탐 분류.

const { getSuppressorsFor, GOOD_PATTERN_CATALOG } = require('../core/good-pattern-catalog');

// ============================================================
// PART 1 — Types
// ============================================================

export interface JudgeFinding {
  id: string;
  verdict: 'agree' | 'dismiss';
  reason: string;
  confidence: number;
}

export interface JudgeResult {
  findings: JudgeFinding[];
  overallAgreement: number;
  summary: string;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=JudgeFinding,JudgeResult

// ============================================================
// PART 2 — Cross-Model Judge System Prompt
// ============================================================

export const CROSS_JUDGE_SYSTEM_PROMPT = `You are an INDEPENDENT code judge. You receive code + static analysis findings.

Your ONLY job: for EACH finding, call classify_finding to make a structured verdict. You MUST NOT skip any finding. You MUST NOT give a general opinion — only per-finding verdicts.

CLASSIFICATION RULES (follow strictly):
1. "dismiss" if the finding matches ANY of these patterns:
   - The flagged text is inside a STRING LITERAL, COMMENT, or REGEX PATTERN (not actual code execution)
   - The finding is about a .catch(() => {}) pattern (intentional best-effort error suppression)
   - The finding is about a React createContext default value (() => {})
   - The finding is about a test mock or stub
   - The finding reports "eval" or "security" but the code is a RULE DEFINITION that detects these patterns (self-reference)
   - The finding is about console.log in a CLI tool (expected behavior)
   - The finding reports a variable "used before declared" but it's an object property access (obj.name)

2. "agree" if the finding matches ANY of these:
   - Actual eval() or new Function() call in production code (not in a string/regex)
   - Empty function body with no comment explaining why
   - Real security vulnerability (hardcoded password, exposed API key)
   - Syntax error or brace imbalance

3. "downgrade" if it's real but low-impact:
   - Style issues (line length, naming)
   - Informational (TODO comments, type annotations)

GOOD PATTERN AWARENESS:
When the code contains recognized quality patterns (guard clauses, try-catch-finally,
type narrowing, readonly modifiers, discriminated unions, etc.), related findings are
MORE LIKELY to be false positives. Look for [GOOD-PATTERN] notes below each finding.
If a finding has associated good patterns, weigh them as evidence toward "dismiss".
A finding with multiple matching good patterns is almost certainly a false positive.

OUTPUT FORMAT (JSON only, one verdict per finding):
{
  "findings": [
    { "id": "F1", "verdict": "dismiss", "reason": "regex rule definition, not actual eval call", "confidence": 0.95 },
    { "id": "F2", "verdict": "agree", "reason": "real empty function with no comment", "confidence": 0.9 },
    { "id": "F3", "verdict": "downgrade", "reason": "console.log in CLI tool is expected", "confidence": 0.85 }
  ],
  "summary": "2 dismissed, 1 agreed, 1 downgraded"
}`;

// IDENTITY_SEAL: PART-2 | role=system-prompt | inputs=none | outputs=CROSS_JUDGE_SYSTEM_PROMPT

// ============================================================
// PART 3 — Judge Prompt Builder
// ============================================================

/** Extract ruleId pattern (e.g. ERR-001, CMX-007, STL-002) from message text */
function extractRuleIdFromMessage(message: string): string | null {
  const match = message.match(/\b([A-Z]{2,4}-\d{3})\b/);
  return match ? match[1] : null;
}

export function buildJudgePrompt(
  code: string,
  findings: Array<{ id: string; severity: string; message: string; file: string; line: number; engine?: string; confidence?: number; team?: string; ruleId?: string }>,
): string {
  const lines: string[] = [
    '=== GENERATED CODE ===',
    '```',
    code.slice(0, 6000),
    '```',
    '',
    '=== VERIFICATION FINDINGS ===',
    '',
    'Each finding includes: source engine, confidence level, and team classification.',
    'Higher confidence (>0.8) = more likely real issue. Lower (<0.5) = more likely false positive.',
    '',
  ];

  // Group by team for better structure
  const byTeam = new Map<string, typeof findings>();
  for (const f of findings) {
    const team = f.team ?? 'unknown';
    const group = byTeam.get(team) ?? [];
    group.push(f);
    byTeam.set(team, group);
  }

  for (const [team, teamFindings] of byTeam) {
    lines.push(`--- ${team.toUpperCase()} ---`);
    for (const f of teamFindings) {
      const conf = f.confidence ? ` (confidence: ${f.confidence})` : '';
      const eng = f.engine ? ` [${f.engine}]` : '';
      lines.push(`[${f.id}] ${f.severity.toUpperCase()} — ${f.file}:${f.line}${eng}${conf}`);
      lines.push(`  ${f.message}`);

      // Good-pattern suppressor lookup
      const effectiveRuleId = f.ruleId ?? extractRuleIdFromMessage(f.message);
      if (effectiveRuleId) {
        const suppressors = getSuppressorsFor(effectiveRuleId);
        if (suppressors.length > 0) {
          const titles = suppressors.map((s: { title: string }) => s.title).join(', ');
          lines.push(`  [GOOD-PATTERN] This code contains good patterns [${titles}] that may make finding ${effectiveRuleId} a false positive`);
        }
      }
    }
    lines.push('');
  }

  lines.push(`Total: ${findings.length} findings across ${byTeam.size} teams. Judge each one.`);
  lines.push('IMPORTANT: Findings from AST engines (ts-morph, typescript) with confidence >0.8 are structurally verified — dismiss only with strong reason.');

  return lines.join('\n');
}

export function parseJudgeResult(raw: string): JudgeResult | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]) as JudgeResult;
  } catch {
    return null;
  }
}

// IDENTITY_SEAL: PART-3 | role=judge-prompt | inputs=code,findings | outputs=JudgeResult
