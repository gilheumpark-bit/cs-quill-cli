// ============================================================
// CS Quill 🦔 — 6-Layer Loop Guard
// ============================================================
// 루프 방지 6중 안전장치:
// 1. 라운드 하드캡 (maxRounds)
// 2. 진전 없으면 포기 (noProgressDelta)
// 3. 수정 대상 없으면 포기
// 4. 연속 실행 차단 (maxConsecutiveExecutions)
// 5. 연속 에러 차단 (maxConsecutiveErrors)
// 6. 팀장 1회 판정 (teamLeadHalt)

// ============================================================
// PART 1 — Types & Config
// ============================================================

export type StopReason =
  | 'passed'
  | 'max-iterations'
  | 'no-progress'
  | 'no-fixes'
  | 'hard-gate-fail'
  | 'budget-exceeded'
  | 'team-lead-halt'
  | 'consecutive-exec-halt'
  | 'consecutive-error-halt';

export interface LoopGuardConfig {
  maxRounds: number;
  passThreshold: number;
  noProgressDelta: number;
  maxConsecutiveExecutions: number;
  maxConsecutiveErrors: number;
  budgetLimitUsd: number;
}

export interface LoopGuardState {
  round: number;
  previousScore: number;
  consecutiveExecutions: number;
  consecutiveErrors: number;
  totalCostUsd: number;
  halted: boolean;
  stopReason: StopReason | null;
}

const DEFAULT_CONFIG: LoopGuardConfig = {
  maxRounds: 3,
  passThreshold: 77,
  noProgressDelta: 2,
  maxConsecutiveExecutions: 5,
  maxConsecutiveErrors: 3,
  budgetLimitUsd: 10,
};

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=StopReason,LoopGuardConfig,LoopGuardState

// ============================================================
// PART 2 — Guard Engine
// ============================================================

export function createLoopGuard(config: Partial<LoopGuardConfig> = {}): {
  state: LoopGuardState;
  check: (score: number, fixCount: number, costUsd: number) => StopReason | null;
  recordExecution: () => boolean;
  recordError: () => boolean;
  reset: () => void;
} {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const state: LoopGuardState = {
    round: 0,
    previousScore: 0,
    consecutiveExecutions: 0,
    consecutiveErrors: 0,
    totalCostUsd: 0,
    halted: false,
    stopReason: null,
  };

  function halt(reason: StopReason): StopReason {
    state.halted = true;
    state.stopReason = reason;
    return reason;
  }

  function check(score: number, fixCount: number, costUsd: number): StopReason | null {
    state.round++;
    state.totalCostUsd += costUsd;

    // 1. 통과
    if (score >= cfg.passThreshold) return halt('passed');

    // 2. 라운드 하드캡
    if (state.round >= cfg.maxRounds) return halt('max-iterations');

    // 3. 진전 없음
    if (state.round > 1 && score - state.previousScore < cfg.noProgressDelta) {
      return halt('no-progress');
    }

    // 4. 수정 대상 없음
    if (fixCount === 0 && state.round > 1) return halt('no-fixes');

    // 5. 예산 초과
    if (state.totalCostUsd >= cfg.budgetLimitUsd) return halt('budget-exceeded');

    state.previousScore = score;
    return null;
  }

  // 6-a. 연속 실행 카운터
  function recordExecution(): boolean {
    state.consecutiveExecutions++;
    state.consecutiveErrors = 0;
    if (state.consecutiveExecutions >= cfg.maxConsecutiveExecutions) {
      halt('consecutive-exec-halt');
      return false;
    }
    return true;
  }

  // 6-b. 연속 에러 카운터
  function recordError(): boolean {
    state.consecutiveErrors++;
    if (state.consecutiveErrors >= cfg.maxConsecutiveErrors) {
      halt('consecutive-error-halt');
      return false;
    }
    return true;
  }

  function reset(): void {
    state.round = 0;
    state.previousScore = 0;
    state.consecutiveExecutions = 0;
    state.consecutiveErrors = 0;
    state.totalCostUsd = 0;
    state.halted = false;
    state.stopReason = null;
  }

  return { state, check, recordExecution, recordError, reset };
}

// IDENTITY_SEAL: PART-2 | role=guard-engine | inputs=score,fixCount,costUsd | outputs=StopReason|null
