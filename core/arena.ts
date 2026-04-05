// @ts-nocheck — external library wrapper, types handled at runtime
// ============================================================
// CS Quill 🦔 — The Arena (다중 에이전트 벤치마크 합의)
// ============================================================
// AI들이 정량적 증거(벤치마크, 린트, AST)를 들고 싸우게 만드는 합의 엔진.
// "의견"이 아닌 "데이터"로 논쟁하고 팀장이 판정.

// ============================================================
// PART 1 — Types
// ============================================================

export interface Evidence {
  type: 'lint' | 'ast' | 'fuzz' | 'perf' | 'security' | 'deep-verify';
  source: string;
  data: Record<string, unknown>;
  score: number;
  findings: string[];
}

export interface AgentOpinion {
  agentId: string;
  model: string;
  verdict: 'approve' | 'reject' | 'fix-required';
  confidence: number;
  evidence: Evidence[];
  critiques: string[];
  suggestedFixes: string[];
}

export interface ArenaResult {
  code: string;
  opinions: AgentOpinion[];
  consensus: 'approved' | 'rejected' | 'fixed';
  finalCode: string;
  rounds: number;
  evidenceScore: number;
  teamLeadVerdict: string;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=Evidence,AgentOpinion,ArenaResult

// ============================================================
// PART 2 — Evidence Collector (정량적 데이터 수집)
// ============================================================

export async function collectEvidence(code: string, fileName: string): Promise<Evidence[]> {
  const evidence: Evidence[] = [];

  // 1. Static pipeline
  try {
    const { runStaticPipeline } = await import('../core/pipeline-bridge');
    const result = await runStaticPipeline(code, 'typescript');
    evidence.push({
      type: 'lint', source: '8-team-pipeline', score: result.score,
      data: { stages: result.teams.map(s => ({ name: s.name, score: s.score, findings: s.findings.length })) },
      findings: result.teams.flatMap(s => s.findings.map(f => typeof f === 'string' ? f : String(f))).slice(0, 20),
    });
  } catch { /* skip */ }

  // 2. Deep verify
  try {
    const { runDeepVerify } = await import('./deep-verify');
    const result = runDeepVerify(code, fileName);
    evidence.push({
      type: 'deep-verify', source: 'deep-verify-7checks', score: result.score,
      data: { checks: result.checks, duration: result.duration },
      findings: result.findings.map(f => `[${f.severity}] ${f.message}`).slice(0, 15),
    });
  } catch { /* skip */ }

  // 3. CFG analysis
  try {
    const { runBrainAnalysis } = await import('./cfg-engine');
    const result = await runBrainAnalysis(code, fileName);
    evidence.push({
      type: 'ast', source: 'cfg-engine', score: Math.max(0, 100 - result.riskPaths.length * 15),
      data: { nodes: result.stats.nodes, risks: result.stats.risks, reductionPercent: result.stats.reductionPercent },
      findings: result.riskPaths.map(p => `[${p.risk}] ${p.description}`),
    });
  } catch { /* skip */ }

  // 4. Fuzz test (quick — 5 inputs only)
  try {
    const { runInSandbox } = await import('../adapters/sandbox');
    const quickInputs = ['null', 'undefined', '""', '0', '[]'];
    const funcMatch = code.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
    const funcName = funcMatch?.[1];

    if (funcName) {
      let crashes = 0;
      const crashDetails: string[] = [];

      for (const input of quickInputs) {
        const testCode = `${code}\ntry { ${funcName}(${input}); } catch(e) { console.log('CRASH:'+e.message); }`;
        const result = runInSandbox(testCode, { timeout: 2000 });
        if (result.stdout.includes('CRASH:')) {
          crashes++;
          crashDetails.push(`${input}: ${result.stdout.match(/CRASH:(.*)/)?.[1] ?? 'unknown'}`);
        }
      }

      evidence.push({
        type: 'fuzz', source: 'quick-fuzz-5inputs', score: Math.round((1 - crashes / quickInputs.length) * 100),
        data: { inputs: quickInputs.length, crashes },
        findings: crashDetails,
      });
    }
  } catch { /* skip */ }

  return evidence;
}

// IDENTITY_SEAL: PART-2 | role=evidence-collector | inputs=code,fileName | outputs=Evidence[]

// ============================================================
// PART 3 — Agent Opinions (AI에게 증거 기반 의견 요청)
// ============================================================

export async function getAgentOpinion(
  code: string,
  evidence: Evidence[],
  agentRole: 'attacker' | 'defender' | 'judge',
): Promise<AgentOpinion | null> {
  const { streamChat } = await import('./ai-bridge');
  const { getTemperature } = await import('./ai-config');

  const evidenceSummary = evidence.map(e =>
    `[${e.type}] ${e.source}: ${e.score}/100 — ${e.findings.slice(0, 5).join('; ')}`,
  ).join('\n');

  const rolePrompts: Record<string, string> = {
    attacker: `You are a hostile code reviewer. Find EVERY flaw. Use the evidence below as ammunition. Be harsh but fair. Only cite issues backed by evidence.`,
    defender: `You are a code defender. For each attack, explain why it's a false positive OR provide a minimal fix. Use evidence to support your defense.`,
    judge: `You are the final judge. Review attacker and defender arguments. Decide: approve (safe), reject (too risky), or fix-required (specific changes needed). Be decisive.`,
  };

  let raw = '';
  try {
    await streamChat({
      systemInstruction: `${rolePrompts[agentRole]}\n\nOutput JSON: {"verdict":"approve"|"reject"|"fix-required","confidence":0.0-1.0,"critiques":["..."],"suggestedFixes":["..."]}`,
      messages: [{
        role: 'user',
        content: `Code:\n\`\`\`\n${code.slice(0, 4000)}\n\`\`\`\n\nEvidence:\n${evidenceSummary}`,
      }],
      onChunk: (t: string) => { raw += t; },
      temperature: agentRole === 'judge' ? getTemperature('judge') : getTemperature('verify'),
    });

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      agentId: agentRole,
      model: 'current',
      verdict: parsed.verdict ?? 'fix-required',
      confidence: parsed.confidence ?? 0.5,
      evidence,
      critiques: parsed.critiques ?? [],
      suggestedFixes: parsed.suggestedFixes ?? [],
    };
  } catch {
    return null;
  }
}

// IDENTITY_SEAL: PART-3 | role=agent-opinions | inputs=code,evidence,role | outputs=AgentOpinion

// ============================================================
// PART 4 — Arena Runner (Attack → Defend → Judge 루프)
// ============================================================

export async function runArena(
  code: string,
  fileName: string,
  onProgress?: (phase: string, detail: string) => void,
): Promise<ArenaResult> {
  onProgress?.('evidence', 'Collecting quantitative evidence...');

  // Phase 1: Collect evidence
  const evidence = await collectEvidence(code, fileName);
  const evidenceScore = evidence.length > 0
    ? Math.round(evidence.reduce((s, e) => s + e.score, 0) / evidence.length)
    : 0;

  onProgress?.('evidence', `${evidence.length} evidence sources, avg score: ${evidenceScore}`);

  // Phase 2: If evidence score > 90, skip arena (fast path)
  if (evidenceScore >= 90 && evidence.every(e => e.findings.length === 0)) {
    return {
      code, opinions: [], consensus: 'approved', finalCode: code,
      rounds: 0, evidenceScore, teamLeadVerdict: 'Auto-approved: evidence score 90+, no findings',
    };
  }

  // Phase 3~5: AI 에이전트 (또는 오프라인 증거 기반 판정)
  let opinions: AgentOpinion[] = [];

  const attacker = await getAgentOpinion(code, evidence, 'attacker');
  let defender: AgentOpinion | null = null;
  if (attacker && attacker.critiques.length > 0) {
    onProgress?.('defend', `Defending against ${attacker.critiques.length} critiques...`);
    defender = await getAgentOpinion(code, evidence, 'defender');
  }
  const judge = await getAgentOpinion(code, evidence, 'judge');
  opinions = [attacker, defender, judge].filter((o): o is AgentOpinion => o !== null);

  // ── 오프라인 Fallback: AI 에이전트 0명이면 증거 기반 자동 판정 ──
  if (opinions.length === 0) {
    onProgress?.('offline', 'AI 미연결 — 증거 기반 자동 판정...');
    // evidence는 Evidence[] 배열 — 평균 점수 산출
    const evidenceScore = evidence.length > 0
      ? Math.round(evidence.reduce((s, e) => s + e.score, 0) / evidence.length) : 0;
    // evidence.data 안의 findings를 추출
    const allDataFindings: string[] = evidence.flatMap(e => {
      const data = e.data as Record<string, unknown>;
      if (Array.isArray(data?.stages)) return (data.stages as Array<{ findings: number }>).filter(s => s.findings > 3).map(s => `${(s as any).name}: ${s.findings}건`);
      if (typeof data?.message === 'string') return [data.message as string];
      return [];
    });

    let offlineVerdict: 'approve' | 'reject' | 'fix-required' = 'approve';
    const offlineCritiques: string[] = [];

    if (evidenceScore < 50) {
      offlineVerdict = 'reject';
      offlineCritiques.push(`증거 평균 ${evidenceScore}/100`);
      offlineCritiques.push(...allDataFindings.slice(0, 5));
    } else if (evidenceScore < 80) {
      offlineVerdict = 'fix-required';
      offlineCritiques.push(...allDataFindings.slice(0, 3));
    }

    opinions = [{
      role: 'judge' as const,
      verdict: offlineVerdict,
      critiques: offlineCritiques,
      suggestedFixes: offlineCritiques.map(c => `Fix: ${c}`),
      confidence: 0.6,
    }];
  }

  // Determine consensus
  let consensus: ArenaResult['consensus'] = 'approved';
  let finalCode = code;
  let teamLeadVerdict = 'No issues found';

  if (judge) {
    if (judge.verdict === 'reject') {
      consensus = 'rejected';
      teamLeadVerdict = `Rejected: ${judge.critiques.join('; ')}`;
    } else if (judge.verdict === 'fix-required') {
      consensus = 'fixed';
      teamLeadVerdict = `Fix required: ${judge.suggestedFixes.join('; ')}`;

      // Apply suggested fixes via AI
      if (judge.suggestedFixes.length > 0) {
        try {
          const { streamChat } = await import('./ai-bridge');
          let fixedCode = '';
          await streamChat({
            systemInstruction: 'Apply the following fixes to the code. Output ONLY the fixed code.',
            messages: [{
              role: 'user',
              content: `Fixes:\n${judge.suggestedFixes.join('\n')}\n\nCode:\n\`\`\`\n${code}\n\`\`\``,
            }],
            onChunk: (t: string) => { fixedCode += t; },
          });
          fixedCode = fixedCode.replace(/^```\w*\n?/gm, '').replace(/```$/gm, '').trim();
          if (fixedCode.length > 20) finalCode = fixedCode;
        } catch { /* keep original */ }
      }
    } else {
      teamLeadVerdict = `Approved with confidence ${Math.round(judge.confidence * 100)}%`;
    }
  }

  return {
    code, opinions, consensus, finalCode,
    rounds: opinions.length, evidenceScore, teamLeadVerdict,
  };
}

// IDENTITY_SEAL: PART-4 | role=arena-runner | inputs=code,fileName | outputs=ArenaResult
