// ============================================================
// CS Quill 🦔 — Team Lead (Judgment Protocol)
// ============================================================
// 팀장은 에이전트 보고를 받아 1회 판정만 한다.
// 에이전트 간 대화 금지. 보고만 받고 판정만.

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
// PART 3 — Verdict Builder
// ============================================================

export function buildTeamLeadPrompt(findings: AgentFinding[]): string {
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

// IDENTITY_SEAL: PART-3 | role=verdict-builder | inputs=AgentFinding[] | outputs=TeamLeadVerdict
