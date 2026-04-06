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
  capped: boolean;   // findings가 BAIL_OUT_THRESHOLD로 캡됨
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

  // Bail-out: findings 폭발 → 캡 처리 (완전 제외 대신 제한)
  if (total > BAIL_OUT_THRESHOLD) {
    // 캡된 findings만으로 severity 집계
    const capped = findings.slice(0, BAIL_OUT_THRESHOLD);
    let hardFail = 0, review = 0, note = 0;
    for (const f of capped) {
      if (f.severity === 'critical') hardFail++;
      else if (f.severity === 'error' || f.severity === 'warning') review++;
      else note++;
    }
    return {
      name: teamName,
      verdict: 'bail-out' as const,
      hardFail, review, note,
      total: BAIL_OUT_THRESHOLD, // 캡된 수치
      isolated: false,          // 더 이상 완전 격리하지 않음
      capped: true,             // 캡 표시
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

  return { name: teamName, verdict, hardFail, review, note, total, isolated: false, capped: false };
}

// ============================================================
// PART 3 — Isolated Aggregation
// ============================================================

/**
 * 팀별 verdict를 합성.
 * - 캡된 팀(capped)은 제외하지 않고 감점 반영하여 포함.
 * - 완전 격리(isolated)된 팀만 판정에서 제외.
 * "한 팀의 폭발이 전체를 무너뜨리지 않는다."
 */
export function aggregateIsolated(teamVerdicts: TeamVerdict[]): IsolatedResult {
  const active = teamVerdicts.filter(t => !t.isolated);
  const isolated = teamVerdicts.filter(t => t.isolated);

  // 캡된 팀도 active에 포함 — bail-out verdict는 'review'로 취급
  const hasHardFail = active.some(t => t.verdict === 'fail');
  const hasReview = active.some(t => t.verdict === 'review' || t.verdict === 'bail-out');

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

/**
 * 캡된 팀의 점수를 계산: max(25, 100 - BAIL_OUT_THRESHOLD * 2) = 40
 * 패널티가 있지만 0점은 아님.
 */
export function getCappedTeamScore(): number {
  return Math.max(25, 100 - BAIL_OUT_THRESHOLD * 2);
}

// IDENTITY_SEAL: PART-3 | role=team-isolation | inputs=teamVerdicts | outputs=IsolatedResult
