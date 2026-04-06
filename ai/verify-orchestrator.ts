// ============================================================
// CS Quill 🦔 — Verify Orchestrator (AI Pipeline)
// ============================================================
// 정규식 파이프라인 결과를 AI 에이전트 체인으로 정제한다.
// 흐름: static findings → team-lead 판정 → cross-judge 오탐 필터
// AI 미설정 시 static 결과를 그대로 반환 (graceful fallback).

// ============================================================
// PART 1 — Types & Imports
// ============================================================

import type { AgentFinding, TeamLeadVerdict } from './team-lead';
import type { JudgeResult } from './cross-judge';

export interface OrchestratedResult {
  teams: Array<{ name: string; score: number; findings: Array<{ line: number; message: string; severity: string }> }>;
  overallScore: number;
  overallStatus: string;
  aiVerified: boolean;
  teamLeadVerdict?: TeamLeadVerdict;
  judgeResult?: JudgeResult;
  falsePositivesRemoved: number;
  metrics?: OrchestrationMetrics;
}

export interface OrchestrationMetrics {
  findingsBeforeAI: number;
  findingsAfterAI: number;
  dismissRate: number;
  teamLeadDurationMs: number;
  crossJudgeDurationMs: number;
  totalDurationMs: number;
  retries: { teamLead: number; crossJudge: number };
  parseFailures: { teamLead: number; crossJudge: number };
  ari?: { provider: string; score: number; circuitState: string };
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=OrchestratedResult,OrchestrationMetrics

// ============================================================
// PART 2 — Static → AgentFinding Converter
// ============================================================

function staticToAgentFindings(
  teams: Array<{ name: string; score: number; findings: Array<string | { line?: number; message: string; severity?: string }> }>,
  file: string,
): AgentFinding[] {
  const findings: AgentFinding[] = [];
  let idx = 0;

  for (const team of teams) {
    for (const f of team.findings) {
      const msg = typeof f === 'string' ? f : f.message;
      const line = typeof f === 'string' ? 0 : (f.line ?? 0);
      const severity = typeof f === 'string' ? 'medium' : mapSeverity(f.severity);

      findings.push({
        agentId: `static-${team.name}`,
        file,
        line,
        severity,
        message: msg,
        confidence: 0.5,
      });
      idx++;
      if (idx > 50) break;
    }
  }

  return findings;
}

function mapSeverity(s?: string): 'critical' | 'high' | 'medium' | 'low' {
  if (s === 'error' || s === 'critical') return 'critical';
  if (s === 'warning') return 'medium';
  return 'low';
}

// IDENTITY_SEAL: PART-2 | role=converter | inputs=static-teams | outputs=AgentFinding[]

// ============================================================
// PART 3 — AI Response Parsing (robust JSON extraction)
// ============================================================

/** Extract JSON from AI response — handles markdown fences, preamble text, trailing text */
function extractJSON(raw: string): string | null {
  // Try markdown code fence first
  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  // Try raw JSON object
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];

  return null;
}

/** Parse and validate TeamLeadVerdict from AI response */
function parseAndValidateVerdict(raw: string): TeamLeadVerdict | null {
  const jsonStr = extractJSON(raw);
  if (!jsonStr) return null;

  try {
    const parsed = JSON.parse(jsonStr);

    // Validate required fields
    if (!parsed.verdict || !['pass', 'fix', 'reject'].includes(parsed.verdict)) return null;
    if (!Array.isArray(parsed.dismissed)) parsed.dismissed = [];
    if (!Array.isArray(parsed.fixes)) parsed.fixes = [];
    if (typeof parsed.overallConfidence !== 'number') parsed.overallConfidence = 0.5;

    // Normalize dismissed entries
    parsed.dismissed = parsed.dismissed.map((d: any) => ({
      findingId: String(d.findingId ?? d.id ?? ''),
      reason: String(d.reason ?? ''),
    })).filter((d: any) => d.findingId);

    // Normalize fixes
    parsed.fixes = parsed.fixes.map((f: any) => ({
      file: String(f.file ?? ''),
      line: Number(f.line ?? 0),
      action: String(f.action ?? ''),
      agreedBy: Array.isArray(f.agreedBy) ? f.agreedBy.map(String) : [],
    }));

    return parsed as TeamLeadVerdict;
  } catch {
    return null;
  }
}

/** Parse and validate JudgeResult from AI response */
function parseAndValidateJudge(raw: string): JudgeResult | null {
  const jsonStr = extractJSON(raw);
  if (!jsonStr) return null;

  try {
    const parsed = JSON.parse(jsonStr);

    if (!Array.isArray(parsed.findings)) return null;

    // Normalize findings
    parsed.findings = parsed.findings
      .map((f: any) => ({
        id: String(f.id ?? ''),
        verdict: ['agree', 'dismiss', 'downgrade'].includes(f.verdict) ? f.verdict : 'agree',
        reason: String(f.reason ?? ''),
        confidence: typeof f.confidence === 'number' ? f.confidence : 0.5,
      }))
      .filter((f: any) => f.id);

    if (!parsed.summary) {
      const dismissed = parsed.findings.filter((f: any) => f.verdict === 'dismiss').length;
      const agreed = parsed.findings.filter((f: any) => f.verdict === 'agree').length;
      parsed.summary = `${dismissed} dismissed, ${agreed} agreed`;
    }

    if (typeof parsed.overallAgreement !== 'number') {
      const total = parsed.findings.length;
      const agreed = parsed.findings.filter((f: any) => f.verdict === 'agree').length;
      parsed.overallAgreement = total > 0 ? agreed / total : 0;
    }

    return parsed as JudgeResult;
  } catch {
    return null;
  }
}

// IDENTITY_SEAL: PART-3 | role=ai-response-parsing | inputs=raw:string | outputs=TeamLeadVerdict|JudgeResult

// ============================================================
// PART 4 — AI Call with Retry
// ============================================================

/** Call AI with 1 retry on parse failure (lower temperature on retry) */
async function callAIWithRetry<T>(
  streamChat: Function,
  systemPrompt: string,
  userPrompt: string,
  parser: (raw: string) => T | null,
  task: string,
): Promise<{ result: T | null; retries: number; parseFailures: number; durationMs: number }> {
  const start = performance.now();
  let retries = 0;
  let parseFailures = 0;

  // First attempt — normal temperature
  try {
    const response = await streamChat({
      systemInstruction: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      task,
      maxTokens: 2048,
    });
    const parsed = parser(response.content);
    if (parsed) {
      return { result: parsed, retries: 0, parseFailures: 0, durationMs: Math.round(performance.now() - start) };
    }
    parseFailures++;
  } catch {
    parseFailures++;
  }

  // Retry with lower temperature for more structured output
  retries++;
  try {
    const response = await streamChat({
      systemInstruction: systemPrompt,
      messages: [{ role: 'user', content: userPrompt + '\n\nIMPORTANT: Respond with ONLY valid JSON. No explanation text before or after.' }],
      task,
      maxTokens: 2048,
      temperature: 0.1,
    });
    const parsed = parser(response.content);
    if (parsed) {
      return { result: parsed, retries, parseFailures, durationMs: Math.round(performance.now() - start) };
    }
    parseFailures++;
  } catch {
    parseFailures++;
  }

  return { result: null, retries, parseFailures, durationMs: Math.round(performance.now() - start) };
}

// IDENTITY_SEAL: PART-4 | role=ai-retry | inputs=streamChat,prompts,parser | outputs=result,metrics

// ============================================================
// PART 5 — Orchestrate: static → team-lead → cross-judge → merge
// ============================================================

export async function orchestrateVerify(
  code: string,
  staticResult: {
    teams: Array<{ name: string; score: number; findings: Array<string | { line?: number; message: string; severity?: string }> }>;
    overallScore?: number;
    overallStatus?: string;
  },
  filePath: string,
): Promise<OrchestratedResult> {
  const { streamChat, updateARI, getARIReport } = require('../core/ai-bridge');
  const { getAIConfig } = require('../core/config');
  const { TEAM_LEAD_SYSTEM_PROMPT, buildTeamLeadPrompt } = require('./team-lead');
  const { CROSS_JUDGE_SYSTEM_PROMPT, buildJudgePrompt } = require('./cross-judge');

  const orchestrationStart = performance.now();
  const config = getAIConfig();

  // Metrics accumulator
  const metrics: OrchestrationMetrics = {
    findingsBeforeAI: 0,
    findingsAfterAI: 0,
    dismissRate: 0,
    teamLeadDurationMs: 0,
    crossJudgeDurationMs: 0,
    totalDurationMs: 0,
    retries: { teamLead: 0, crossJudge: 0 },
    parseFailures: { teamLead: 0, crossJudge: 0 },
  };

  // Helper: build static-only fallback result
  function buildStaticFallback(verified: boolean): OrchestratedResult {
    return {
      teams: staticResult.teams.map(t => ({
        name: t.name,
        score: t.score,
        findings: t.findings.map(f => typeof f === 'string'
          ? { line: 0, message: f, severity: 'warning' }
          : { line: f.line ?? 0, message: f.message, severity: f.severity ?? 'warning' },
        ),
      })),
      overallScore: staticResult.overallScore ?? 0,
      overallStatus: staticResult.overallStatus ?? 'unknown',
      aiVerified: verified,
      falsePositivesRemoved: 0,
      metrics: { ...metrics, totalDurationMs: Math.round(performance.now() - orchestrationStart) },
    };
  }

  // AI 미설정 → static 결과 그대로 반환
  if (!config.apiKey) {
    return buildStaticFallback(false);
  }

  // Step 1: static findings → AgentFinding 변환
  const agentFindings = staticToAgentFindings(staticResult.teams, filePath);
  metrics.findingsBeforeAI = agentFindings.length;

  if (agentFindings.length === 0) {
    return {
      teams: staticResult.teams.map(t => ({
        name: t.name,
        score: t.score,
        findings: [],
      })),
      overallScore: staticResult.overallScore ?? 100,
      overallStatus: 'pass',
      aiVerified: true,
      falsePositivesRemoved: 0,
      metrics: { ...metrics, totalDurationMs: Math.round(performance.now() - orchestrationStart) },
    };
  }

  // Step 2: Team Lead 판정 — pass code context for good-pattern detection
  const teamLeadPrompt = buildTeamLeadPrompt(agentFindings, code.slice(0, 8000));
  const teamLeadCall = await callAIWithRetry(
    streamChat,
    TEAM_LEAD_SYSTEM_PROMPT,
    teamLeadPrompt,
    parseAndValidateVerdict,
    'verify',
  );
  const verdict = teamLeadCall.result;
  metrics.teamLeadDurationMs = teamLeadCall.durationMs;
  metrics.retries.teamLead = teamLeadCall.retries;
  metrics.parseFailures.teamLead = teamLeadCall.parseFailures;

  // ARI update after team-lead call
  try {
    const teamLeadSuccess = verdict !== null;
    updateARI(config.provider, teamLeadSuccess);
    if (process.env.CS_DEBUG) {
      const ariState = getARIReport().find((s: any) => s.provider === config.provider);
      if (ariState) console.log(`  [ARI] team-lead ${teamLeadSuccess ? 'OK' : 'FAIL'} → ${config.provider} score=${ariState.score} circuit=${ariState.circuitState}`);
    }
  } catch { /* ARI update non-critical */ }

  // Step 3: Cross-Judge 오탐 필터
  const judgeFindingsInput = agentFindings.map((f, i) => ({
    id: `${f.agentId}-${i}`,
    severity: f.severity,
    message: f.message,
    file: f.file,
    line: f.line,
    confidence: f.confidence,
    team: f.agentId.replace('static-', ''),
  }));

  const judgePrompt = buildJudgePrompt(code.slice(0, 6000), judgeFindingsInput);
  const judgeCall = await callAIWithRetry(
    streamChat,
    CROSS_JUDGE_SYSTEM_PROMPT,
    judgePrompt,
    parseAndValidateJudge,
    'verify',
  );
  const judgeResult = judgeCall.result;
  metrics.crossJudgeDurationMs = judgeCall.durationMs;
  metrics.retries.crossJudge = judgeCall.retries;
  metrics.parseFailures.crossJudge = judgeCall.parseFailures;

  // ARI update after cross-judge call
  try {
    const judgeSuccess = judgeResult !== null;
    updateARI(config.provider, judgeSuccess);
    if (process.env.CS_DEBUG) {
      const ariState = getARIReport().find((s: any) => s.provider === config.provider);
      if (ariState) console.log(`  [ARI] cross-judge ${judgeSuccess ? 'OK' : 'FAIL'} → ${config.provider} score=${ariState.score} circuit=${ariState.circuitState}`);
    }
  } catch { /* ARI update non-critical */ }

  // Capture ARI state in metrics
  try {
    const ariState = getARIReport().find((s: any) => s.provider === config.provider);
    if (ariState) {
      metrics.ari = { provider: ariState.provider, score: ariState.score, circuitState: ariState.circuitState };
    }
  } catch { /* ARI report non-critical */ }

  // Step 4: Merge dismissals from both AI stages
  const dismissedIds = new Set<string>();
  if (judgeResult) {
    for (const f of judgeResult.findings) {
      if (f.verdict === 'dismiss') dismissedIds.add(f.id);
    }
  }
  if (verdict) {
    for (const d of verdict.dismissed) {
      dismissedIds.add(d.findingId);
    }
  }

  const falsePositivesRemoved = dismissedIds.size;

  // Step 5: Rebuild teams with dismissed findings removed and scores recalculated
  const refinedTeams = staticResult.teams.map((team) => {
    const teamFindings = team.findings
      .map((f, fIdx) => {
        const id = `static-${team.name}-${fIdx}`;
        if (dismissedIds.has(id)) return null;
        return typeof f === 'string'
          ? { line: 0, message: f, severity: 'warning' as const }
          : { line: f.line ?? 0, message: f.message, severity: f.severity ?? 'warning' };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null);

    const errorCount = teamFindings.filter(f => f.severity === 'error' || f.severity === 'critical').length;
    const warnCount = teamFindings.filter(f => f.severity === 'warning' || f.severity === 'medium').length;
    const errorPenalty = Math.min(errorCount * 10, 30);
    const warnPenalty = Math.min(warnCount * 3, 20);
    const score = Math.max(0, Math.min(100, 100 - errorPenalty - warnPenalty));

    return { name: team.name, score, findings: teamFindings };
  });

  const overallScore = refinedTeams.length > 0
    ? Math.round(refinedTeams.reduce((s, t) => s + t.score, 0) / refinedTeams.length)
    : 0;
  const overallStatus = overallScore >= 80 ? 'pass' : overallScore >= 60 ? 'warn' : 'fail';

  // Finalize metrics
  const totalFindingsAfter = refinedTeams.reduce((sum, t) => sum + t.findings.length, 0);
  metrics.findingsAfterAI = totalFindingsAfter;
  metrics.dismissRate = metrics.findingsBeforeAI > 0
    ? Math.round((falsePositivesRemoved / metrics.findingsBeforeAI) * 100) / 100
    : 0;
  metrics.totalDurationMs = Math.round(performance.now() - orchestrationStart);

  return {
    teams: refinedTeams,
    overallScore,
    overallStatus,
    aiVerified: !!(verdict || judgeResult),
    teamLeadVerdict: verdict ?? undefined,
    judgeResult: judgeResult ?? undefined,
    falsePositivesRemoved,
    metrics,
  };
}

// IDENTITY_SEAL: PART-5 | role=orchestrator | inputs=code,staticResult,filePath | outputs=OrchestratedResult
