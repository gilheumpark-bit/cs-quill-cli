// ============================================================
// CS Quill 🦔 — Team Lead (Judgment Protocol)
// ============================================================
// 팀장은 에이전트 보고를 받아 1회 판정만 한다.
// 에이전트 간 대화 금지. 보고만 받고 판정만.

const { GOOD_PATTERN_CATALOG } = require('../core/good-pattern-catalog');

// ============================================================
// PART 1 — Types
// ============================================================

export interface AgentFinding {
  agentId: string;
  file: string;
  line: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  suggestedFix?: string;
  confidence: number;
}

export interface TeamLeadVerdict {
  verdict: 'pass' | 'fix' | 'reject';
  fixes: Array<{
    file: string;
    line: number;
    action: string;
    agreedBy: string[];
  }>;
  dismissed: Array<{
    findingId: string;
    reason: string;
  }>;
  overallConfidence: number;
  stopReason?: string;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=AgentFinding,TeamLeadVerdict

// ============================================================
// PART 2 — Team Lead System Prompt
// ============================================================

export const TEAM_LEAD_SYSTEM_PROMPT = `You are the CS Quill Team Lead. You make a FINAL judgment on static analysis findings.

CRITICAL: Most findings from regex-based static analysis are FALSE POSITIVES. Your job is to AGGRESSIVELY filter noise.

DISMISS if:
- The finding is about text inside a string literal, comment, regex pattern, or template literal
- The finding is about .catch(() => {}) — this is intentional best-effort error handling
- The finding is about a test mock returning null or having empty body
- The finding is about "security" keyword appearing in code that IMPLEMENTS security checks (self-reference)
- The finding is about console.log in a CLI/Node.js tool (expected)
- The finding is about CSS values like "50%", "translateX(-50%)" (not code issues)
- The finding is about article/fiction content strings containing "임시", "미완성" (story text, not TODO)
- The code contains recognized GOOD PATTERNS that directly address the finding (e.g., try-catch-finally handles error concerns, type narrowing with typeof/instanceof handles null-safety concerns, guard clauses handle complexity concerns, const preference handles mutation concerns, Promise.all handles async-performance concerns). If [GOOD PATTERNS DETECTED] is listed below, cross-reference them against the finding before keeping it.

KEEP only if:
- Actual runtime bug risk (real null deref, real eval call, real empty function needing logic)
- Real security vulnerability (hardcoded credentials in production code)

OUTPUT FORMAT (JSON only):
{
  "verdict": "pass",
  "fixes": [],
  "dismissed": [
    { "findingId": "F1", "reason": "regex pattern string, not actual eval call" }
  ],
  "overallConfidence": 0.9
}`;

// IDENTITY_SEAL: PART-2 | role=system-prompt | inputs=none | outputs=TEAM_LEAD_SYSTEM_PROMPT

// ============================================================
// PART 3 — Good Pattern Detection
// ============================================================

interface DetectedPattern {
  id: string;
  title: string;
  suppresses: string[];
}

const GOOD_PATTERN_CHECKS: Array<{ regex: RegExp; catalogIds: string[] }> = [
  { regex: /try\s*\{[\s\S]*?catch[\s\S]*?finally/,          catalogIds: ['GQ-AS-005'] },
  { regex: /try\s*\{[\s\S]*?catch/,                          catalogIds: ['GQ-EH-003'] },
  { regex: /typeof\s+\w+\s*[!=]==?\s*['"`]/,                 catalogIds: ['GQ-NL-010'] },
  { regex: /instanceof\s+\w+/,                               catalogIds: ['GQ-EH-002'] },
  { regex: /if\s*\([^)]*\)\s*(return|throw)\b/,              catalogIds: ['GQ-FN-004'] },
  { regex: /\bconst\s+\w+/,                                  catalogIds: ['GQ-FN-009'] },
  { regex: /Promise\.all\s*\(/,                               catalogIds: ['GQ-AS-002'] },
  { regex: /Promise\.allSettled\s*\(/,                        catalogIds: ['GQ-AS-003'] },
  { regex: /\?\./,                                            catalogIds: ['GQ-NL-001'] },
  { regex: /\?\?/,                                            catalogIds: ['GQ-NL-002'] },
  { regex: /async\s+function|async\s*\(/,                     catalogIds: ['GQ-AS-001'] },
  { regex: /\.filter\s*\([\s\S]*?\.map\s*\(/,                catalogIds: ['GQ-FN-008'] },
  { regex: /readonly\s+/,                                     catalogIds: ['GQ-TS-005'] },
  { regex: /Array\.isArray\s*\(/,                             catalogIds: ['GQ-NL-006'] },
  { regex: /Number\.isNaN\s*\(/,                              catalogIds: ['GQ-NL-008'] },
  { regex: /AbortController/,                                 catalogIds: ['GQ-AS-004'] },
  { regex: /as\s+const\b/,                                    catalogIds: ['GQ-TS-011'] },
];

function detectGoodPatterns(code: string): DetectedPattern[] {
  const catalogMap = new Map<string, typeof GOOD_PATTERN_CATALOG[number]>();
  for (const entry of GOOD_PATTERN_CATALOG) {
    catalogMap.set(entry.id, entry);
  }

  const seen = new Set<string>();
  const detected: DetectedPattern[] = [];

  for (const check of GOOD_PATTERN_CHECKS) {
    if (check.regex.test(code)) {
      for (const catId of check.catalogIds) {
        if (seen.has(catId)) continue;
        seen.add(catId);
        const meta = catalogMap.get(catId);
        if (meta) {
          detected.push({
            id: meta.id,
            title: meta.title,
            suppresses: meta.suppresses ?? [],
          });
        }
      }
    }
  }

  return detected;
}

// ============================================================
// PART 4 — Verdict Builder
// ============================================================

export function buildTeamLeadPrompt(findings: AgentFinding[], code?: string): string {
  const grouped = new Map<string, AgentFinding[]>();

  for (const f of findings) {
    const key = `${f.file}:${f.line}`;
    const existing = grouped.get(key) ?? [];
    existing.push(f);
    grouped.set(key, existing);
  }

  const lines: string[] = ['Agent Findings Report:\n'];

  for (const [location, items] of grouped) {
    lines.push(`[${location}]`);
    for (const item of items) {
      lines.push(`  ${item.agentId}: [${item.severity}] ${item.message} (confidence: ${item.confidence})`);
      if (item.suggestedFix) lines.push(`    fix: ${item.suggestedFix}`);
    }
    lines.push('');
  }

  lines.push(`\nTotal: ${findings.length} findings from ${new Set(findings.map(f => f.agentId)).size} agents.`);

  // Append detected good patterns as dismiss evidence
  if (code) {
    const detected = detectGoodPatterns(code);
    if (detected.length > 0) {
      const names = detected.map(d => d.title).join(', ');
      lines.push(`\n[GOOD PATTERNS DETECTED]: ${names}`);

      const allSuppressed = detected.flatMap(d => d.suppresses).filter(Boolean);
      if (allSuppressed.length > 0) {
        lines.push(`[SUPPRESSED RULE IDs]: ${[...new Set(allSuppressed)].join(', ')}`);
      }

      lines.push('Cross-reference these patterns against findings before judging — dismiss findings that are directly addressed by detected good patterns.');
    }
  }

  lines.push('Make your judgment.');

  return lines.join('\n');
}

export function parseVerdict(raw: string): TeamLeadVerdict | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]) as TeamLeadVerdict;
  } catch {
    return null;
  }
}

// IDENTITY_SEAL: PART-3 | role=good-pattern-detection | inputs=code:string | outputs=DetectedPattern[]
// IDENTITY_SEAL: PART-4 | role=verdict-builder | inputs=AgentFinding[],code? | outputs=TeamLeadVerdict
