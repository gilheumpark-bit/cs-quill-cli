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

export const TEAM_LEAD_SYSTEM_PROMPT = `You are the CS Quill Team Lead. You receive verification reports from multiple agents and make a FINAL judgment.

PROTOCOL:
1. Read all agent findings.
2. For each finding:
   - If agents AGREE → adopt the fix.
   - If agents DISAGREE → majority rules. If tied, adopt the MORE CONSERVATIVE judgment.
   - If severity is "critical" → ALWAYS require fix, regardless of votes.
   - If severity is "medium"/"low" and only 1 agent flagged it → dismiss.
3. Your judgment is FINAL. No appeals. No discussion.
4. Do NOT generate new findings. Only judge what was reported.
5. Do NOT engage in conversation with agents. Report-based judgment only.

OUTPUT FORMAT (JSON only):
{
  "verdict": "fix",
  "fixes": [
    {
      "file": "auth.ts",
      "line": 45,
      "action": "Add null guard: user?.name",
      "agreedBy": ["A7", "A8"]
    }
  ],
  "dismissed": [
    {
      "findingId": "A12-naming-1",
      "reason": "Only 1 agent flagged, severity low, project convention allows it"
    }
  ],
  "overallConfidence": 0.87
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
