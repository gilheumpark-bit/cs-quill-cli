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
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=OrchestratedResult

// ============================================================
// PART 2 — Static → AgentFinding 변환
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
        confidence: 0.5, // static analysis = lower confidence
      });
      idx++;
      if (idx > 50) break; // cap per-team to avoid token overflow
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
// PART 3 — Orchestrate: team-lead → cross-judge
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
  const { streamChat } = require('../core/ai-bridge');
  const { getAIConfig } = require('../core/config');
  const { TEAM_LEAD_SYSTEM_PROMPT, buildTeamLeadPrompt, parseVerdict } = require('./team-lead');
  const { CROSS_JUDGE_SYSTEM_PROMPT, buildJudgePrompt, parseJudgeResult } = require('./cross-judge');

  const config = getAIConfig();

  // AI 미설정 → static 결과 그대로 반환
  if (!config.apiKey) {
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
      aiVerified: false,
      falsePositivesRemoved: 0,
    };
  }

  // Step 1: static findings → AgentFinding 변환
  const agentFindings = staticToAgentFindings(staticResult.teams, filePath);

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
    };
  }

  // Step 2: Team Lead 판정
  let verdict: TeamLeadVerdict | null = null;
  try {
    const teamLeadPrompt = buildTeamLeadPrompt(agentFindings);
    const teamLeadResult = await streamChat({
      systemInstruction: TEAM_LEAD_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: teamLeadPrompt }],
      task: 'verify',
      maxTokens: 2048,
    });
    verdict = parseVerdict(teamLeadResult.content);
  } catch {
    // AI 호출 실패 → static 결과 유지
  }

  // Step 3: Cross-Judge 오탐 필터
  let judgeResult: JudgeResult | null = null;
  try {
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
    const judgeResponse = await streamChat({
      systemInstruction: CROSS_JUDGE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: judgePrompt }],
      task: 'verify',
      maxTokens: 2048,
    });
    judgeResult = parseJudgeResult(judgeResponse.content);
  } catch {
    // Cross-judge 실패 → team-lead 결과만 사용
  }

  // Step 4: 결과 합산 — 오탐 제거 후 점수 재계산
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

  // 팀별로 오탐 제거된 findings 재구성
  const refinedTeams = staticResult.teams.map((team, teamIdx) => {
    const teamFindings = team.findings
      .map((f, fIdx) => {
        const id = `static-${team.name}-${fIdx}`;
        if (dismissedIds.has(id)) return null;
        return typeof f === 'string'
          ? { line: 0, message: f, severity: 'warning' as const }
          : { line: f.line ?? 0, message: f.message, severity: f.severity ?? 'warning' };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null);

    // 점수 재계산: 오탐 제거 후 남은 findings 기반 — 로그 스케일 감점
    const errorCount = teamFindings.filter(f => f.severity === 'error' || f.severity === 'critical').length;
    const warnCount = teamFindings.filter(f => f.severity === 'warning' || f.severity === 'medium').length;
    // 기존 공식(error*20, warn*5)은 findings 3개만으로 점수가 0이 됨.
    // 로그 스케일로 감점 완화: error당 최대 10점, warning당 최대 3점
    const errorPenalty = Math.min(errorCount * 10, 30);
    const warnPenalty = Math.min(warnCount * 3, 20);
    const score = Math.max(0, Math.min(100, 100 - errorPenalty - warnPenalty));

    return { name: team.name, score, findings: teamFindings };
  });

  const overallScore = refinedTeams.length > 0
    ? Math.round(refinedTeams.reduce((s, t) => s + t.score, 0) / refinedTeams.length)
    : 0;
  const overallStatus = overallScore >= 80 ? 'pass' : overallScore >= 60 ? 'warn' : 'fail';

  return {
    teams: refinedTeams,
    overallScore,
    overallStatus,
    aiVerified: true,
    teamLeadVerdict: verdict ?? undefined,
    judgeResult: judgeResult ?? undefined,
    falsePositivesRemoved,
  };
}

// IDENTITY_SEAL: PART-3 | role=orchestrator | inputs=code,staticResult | outputs=OrchestratedResult
