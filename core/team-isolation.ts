// ============================================================
// CS Quill 🦔 — Team Isolation (NOA_OS 적용)
// ============================================================
// 한 팀의 오탐 폭발이 다른 팀의 verdict에 영향을 주지 않도록 격리.
// ESA의 Sandbox Isolation Matrix와 동일 철학.
//
// 규칙:
// 1. 각 팀의 findings는 독립 verdict를 가짐
// 2. 한 팀이 bail-out해도 다른 팀은 정상 진행
// 3. 최종 verdict는 팀별 verdict의 합성 (worst-of-all이 아님)

// ============================================================
// PART 1 — Types
// ============================================================

export interface TeamVerdict {
  name: string;
  verdict: 'pass' | 'review' | 'fail' | 'bail-out';
  hardFail: number;
  review: number;
  note: number;
  total: number;
  isolated: boolean; // bail-out으로 격리됨
}

export interface IsolatedResult {
  teamVerdicts: TeamVerdict[];
  overallVerdict: 'pass' | 'review' | 'fail';
  activeTeams: number; // bail-out 제외
  isolatedTeams: number;
}

// ============================================================
// PART 2 — Team-level Verdict
// ============================================================

const BAIL_OUT_THRESHOLD = 30; // 팀당 findings 이 이상이면 bail-out

export function computeTeamVerdict(
  teamName: string,
  findings: Array<{ severity: string; message: string }>,
): TeamVerdict {
  const total = findings.length;

  // Bail-out: findings 폭발
  if (total > BAIL_OUT_THRESHOLD) {
    return {
      name: teamName,
      verdict: 'bail-out',
      hardFail: 0, review: 0, note: 0, total,
      isolated: true,
    };
  }

  let hardFail = 0, review = 0, note = 0;
  for (const f of findings) {
    if (f.severity === 'critical') hardFail++;
    else if (f.severity === 'error' || f.severity === 'warning') review++;
    else note++;
  }

  const verdict = hardFail > 0 ? 'fail' as const
    : review > 0 ? 'review' as const
    : 'pass' as const;

  return { name: teamName, verdict, hardFail, review, note, total, isolated: false };
}

// ============================================================
// PART 3 — Isolated Aggregation
// ============================================================

/**
 * 팀별 verdict를 합성하되, bail-out 팀은 최종 판정에서 제외.
 * "한 팀의 폭발이 전체를 무너뜨리지 않는다."
 */
export function aggregateIsolated(teamVerdicts: TeamVerdict[]): IsolatedResult {
  const active = teamVerdicts.filter(t => !t.isolated);
  const isolated = teamVerdicts.filter(t => t.isolated);

  // 활성 팀만으로 최종 판정
  const hasHardFail = active.some(t => t.verdict === 'fail');
  const hasReview = active.some(t => t.verdict === 'review');

  const overallVerdict = hasHardFail ? 'fail' as const
    : hasReview ? 'review' as const
    : 'pass' as const;

  return {
    teamVerdicts,
    overallVerdict,
    activeTeams: active.length,
    isolatedTeams: isolated.length,
  };
}

// IDENTITY_SEAL: PART-3 | role=team-isolation | inputs=teamVerdicts | outputs=IsolatedResult
