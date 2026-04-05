// ============================================================
// CS Quill 🦔 — AI Configuration (온도 + 싱글키 라우팅)
// ============================================================
// 1. 명령어별 최적 temperature 매핑
// 2. 키 1개로 여러 역할 자동 분배 (모델별 강점 기반)

// ============================================================
// PART 1 — Temperature Map (명령어별 최적 온도)
// ============================================================

export type AITask =
  | 'plan'           // SEAL 분해
  | 'generate'       // 코드 생성
  | 'verify'         // 크로스모델 검증
  | 'judge'          // 팀장 판정
  | 'explain'        // 코드 설명
  | 'vibe'           // 바이브 스펙 정리
  | 'commit-msg'     // 커밋 메시지
  | 'conflict'       // 머지 충돌 해결
  | 'test-gen'       // 테스트 생성
  | 'report'         // 리포트/학습
  | 'refactor'       // 리팩토링 제안
  | 'translate';     // 코드 번역

export const TEMPERATURE_MAP: Record<AITask, number> = {
  'plan':        0.3,   // 구조 정확해야 함 — JSON 파싱 안정
  'generate':    0.4,   // 일관된 코드 + 약간 창의
  'verify':      0.1,   // 판단은 냉정하게 — 오탐 최소화
  'judge':       0.1,   // 판정은 일관되게 — 재실행해도 같은 결과
  'explain':     0.5,   // 자연스러운 설명 — 사람이 읽을 텍스트
  'vibe':        0.7,   // 창의적 스펙 정리 — 유저 의도 확장
  'commit-msg':  0.3,   // 간결 정확 — 컨벤션 준수
  'conflict':    0.2,   // 코드 정확 — 실수 허용 안 됨
  'test-gen':    0.4,   // 다양한 케이스 — 엣지케이스 발견
  'report':      0.5,   // 친절한 설명 — 교육적
  'refactor':    0.3,   // 구조 변경은 보수적으로
  'translate':   0.3,   // 의미 보존 정확
};

export function getTemperature(task: AITask): number {
  return TEMPERATURE_MAP[task];
}

// IDENTITY_SEAL: PART-1 | role=temperature | inputs=AITask | outputs=number

// ============================================================
// PART 2 — AI Provider Strengths (대표 AI별 강점 분석)
// ============================================================

export interface AIStrength {
  provider: string;
  model: string;
  strengths: string[];
  weaknesses: string[];
  bestFor: AITask[];
  costTier: 'free' | 'cheap' | 'moderate' | 'expensive';
  contextWindow: number;
  speed: 'fast' | 'medium' | 'slow';
  codeQuality: number;    // 1-10
  reasoning: number;      // 1-10
  instruction: number;    // 1-10  (지시 따르기)
  creativity: number;     // 1-10
  consistency: number;    // 1-10  (같은 입력 같은 출력)
}

export const AI_PROFILES: AIStrength[] = [
  // ── Anthropic ──
  {
    provider: 'anthropic', model: 'claude-opus-4-6',
    strengths: ['최강 추론', '장문 코드', '복잡한 아키텍처', '컨텍스트 유지'],
    weaknesses: ['느림', '비쌈', '때로 과잉 설명'],
    bestFor: ['plan', 'generate', 'refactor', 'conflict'],
    costTier: 'expensive', contextWindow: 1000000, speed: 'slow',
    codeQuality: 10, reasoning: 10, instruction: 9, creativity: 8, consistency: 8,
  },
  {
    provider: 'anthropic', model: 'claude-sonnet-4-6',
    strengths: ['균형 좋음', 'SWE-bench 1위', '빠름', '코드 품질'],
    weaknesses: ['Opus보다 추론 약함'],
    bestFor: ['generate', 'verify', 'test-gen', 'explain'],
    costTier: 'moderate', contextWindow: 1000000, speed: 'medium',
    codeQuality: 9, reasoning: 8, instruction: 9, creativity: 7, consistency: 9,
  },
  {
    provider: 'anthropic', model: 'claude-haiku-4-5',
    strengths: ['초고속', '저렴', '간단한 작업 최적'],
    weaknesses: ['복잡한 추론 약함', '장문 코드 불안정'],
    bestFor: ['verify', 'judge', 'commit-msg', 'report'],
    costTier: 'cheap', contextWindow: 200000, speed: 'fast',
    codeQuality: 6, reasoning: 5, instruction: 8, creativity: 5, consistency: 9,
  },

  // ── OpenAI ──
  {
    provider: 'openai', model: 'gpt-5.4',
    strengths: ['강한 추론', '멀티턴 대화', '폭넓은 지식'],
    weaknesses: ['가끔 장황', '코드 스타일 불일관'],
    bestFor: ['plan', 'generate', 'explain', 'vibe'],
    costTier: 'expensive', contextWindow: 128000, speed: 'medium',
    codeQuality: 9, reasoning: 9, instruction: 8, creativity: 9, consistency: 7,
  },
  {
    provider: 'openai', model: 'gpt-5.4-mini',
    strengths: ['빠름', '저렴', '지시 잘 따름'],
    weaknesses: ['복잡한 코드 약함'],
    bestFor: ['verify', 'judge', 'commit-msg', 'translate'],
    costTier: 'cheap', contextWindow: 128000, speed: 'fast',
    codeQuality: 7, reasoning: 6, instruction: 9, creativity: 5, consistency: 9,
  },

  // ── Google ──
  {
    provider: 'google', model: 'gemini-2.5-pro',
    strengths: ['1M 컨텍스트', '멀티모달', '긴 코드 분석'],
    weaknesses: ['코드 생성 품질 불균일', '가끔 할루시네이션'],
    bestFor: ['plan', 'explain', 'report', 'vibe'],
    costTier: 'moderate', contextWindow: 2100000, speed: 'medium',
    codeQuality: 7, reasoning: 8, instruction: 7, creativity: 8, consistency: 6,
  },
  {
    provider: 'google', model: 'gemini-2.5-flash',
    strengths: ['무료 티어', '빠름', '1M 컨텍스트'],
    weaknesses: ['추론 약함', '코드 품질 낮음'],
    bestFor: ['verify', 'commit-msg', 'translate'],
    costTier: 'free', contextWindow: 1000000, speed: 'fast',
    codeQuality: 5, reasoning: 5, instruction: 7, creativity: 5, consistency: 7,
  },

  // ── Groq ──
  {
    provider: 'groq', model: 'llama-3.3-70b',
    strengths: ['초초고속', '무료', '간단한 작업 최적'],
    weaknesses: ['복잡한 코드 못 함', '컨텍스트 작음'],
    bestFor: ['judge', 'commit-msg', 'translate'],
    costTier: 'free', contextWindow: 32000, speed: 'fast',
    codeQuality: 5, reasoning: 5, instruction: 6, creativity: 4, consistency: 8,
  },

  // ── Local ──
  {
    provider: 'ollama', model: 'llama3',
    strengths: ['완전 무료', '오프라인', '프라이버시'],
    weaknesses: ['품질 낮음', 'GPU 필요', '느릴 수 있음'],
    bestFor: ['commit-msg', 'translate'],
    costTier: 'free', contextWindow: 8000, speed: 'slow',
    codeQuality: 4, reasoning: 4, instruction: 5, creativity: 4, consistency: 7,
  },
];

// IDENTITY_SEAL: PART-2 | role=ai-profiles | inputs=none | outputs=AI_PROFILES

// ============================================================
// PART 3 — Single Key Auto Router (키 1개 → 역할 자동 배정)
// ============================================================

export interface RouteDecision {
  task: AITask;
  model: string;
  temperature: number;
  reason: string;
}

export function routeTask(
  task: AITask,
  availableKeys: Array<{ provider: string; model: string }>,
): RouteDecision {
  const temp = getTemperature(task);

  if (availableKeys.length === 0) {
    return { task, model: 'none', temperature: temp, reason: 'No API keys configured' };
  }

  // Find best model for this task
  const candidates = availableKeys.map(key => {
    const profile = AI_PROFILES.find(p => p.provider === key.provider && p.model === key.model)
      ?? AI_PROFILES.find(p => p.provider === key.provider);

    if (!profile) return { key, score: 0, profile: null };

    let score = 0;
    if (profile.bestFor.includes(task)) score += 30;

    // Task-specific scoring
    switch (task) {
      case 'plan':
      case 'refactor':
        score += profile.reasoning * 3 + profile.consistency * 2;
        break;
      case 'generate':
      case 'test-gen':
        score += profile.codeQuality * 3 + profile.creativity * 2;
        break;
      case 'verify':
      case 'judge':
        score += profile.consistency * 3 + profile.instruction * 2;
        // Prefer DIFFERENT model than generator for cross-check
        score += 5;
        break;
      case 'explain':
      case 'report':
        score += profile.creativity * 2 + profile.instruction * 2;
        break;
      case 'vibe':
        score += profile.creativity * 3 + profile.reasoning * 2;
        break;
      case 'commit-msg':
      case 'translate':
        score += profile.instruction * 3 + profile.consistency * 2;
        // Prefer cheap/fast for simple tasks
        if (profile.costTier === 'free' || profile.costTier === 'cheap') score += 10;
        break;
      case 'conflict':
        score += profile.codeQuality * 3 + profile.reasoning * 2;
        break;
    }

    return { key, score, profile };
  });

  const best = candidates.sort((a, b) => b.score - a.score)[0];

  return {
    task,
    model: best.key.model,
    temperature: temp,
    reason: best.profile
      ? `${best.profile.model}: ${best.profile.strengths[0]} (score: ${best.score})`
      : `${best.key.model} (default)`,
  };
}

// IDENTITY_SEAL: PART-3 | role=router | inputs=task,keys | outputs=RouteDecision

// ============================================================
// PART 4 — Single Key Optimizer (키 1개일 때 최적 전략)
// ============================================================

export function getSingleKeyStrategy(provider: string, model: string): Record<AITask, { temperature: number; tip: string }> {
  const profile = AI_PROFILES.find(p => p.provider === provider && p.model === model)
    ?? AI_PROFILES.find(p => p.provider === provider);

  const base: Record<AITask, { temperature: number; tip: string }> = {
    'plan':        { temperature: 0.3, tip: '' },
    'generate':    { temperature: 0.4, tip: '' },
    'verify':      { temperature: 0.1, tip: '' },
    'judge':       { temperature: 0.1, tip: '' },
    'explain':     { temperature: 0.5, tip: '' },
    'vibe':        { temperature: 0.7, tip: '' },
    'commit-msg':  { temperature: 0.3, tip: '' },
    'conflict':    { temperature: 0.2, tip: '' },
    'test-gen':    { temperature: 0.4, tip: '' },
    'report':      { temperature: 0.5, tip: '' },
    'refactor':    { temperature: 0.3, tip: '' },
    'translate':   { temperature: 0.3, tip: '' },
  };

  if (!profile) return base;

  // Adjust tips based on model strengths/weaknesses
  if (profile.codeQuality < 7) {
    base['generate'].tip = '💡 이 모델은 코드 생성이 약할 수 있음. --mode strict 추천';
    base['generate'].temperature = 0.3; // 더 보수적으로
  }
  if (profile.reasoning < 7) {
    base['plan'].tip = '💡 복잡한 태스크는 PART를 적게 나누는 게 나음';
  }
  if (profile.consistency < 7) {
    base['verify'].tip = '💡 검증 결과가 불안정할 수 있음. 2회 실행 추천';
    base['judge'].tip = '💡 판정이 흔들릴 수 있음. strict 모드 추천';
  }
  if (profile.contextWindow < 50000) {
    base['generate'].tip += ' | 컨텍스트 작아서 큰 파일 생성 주의';
    base['plan'].tip += ' | 레퍼런스 주입량 줄일 것';
  }
  if (profile.costTier === 'expensive') {
    base['commit-msg'].tip = '💡 커밋 메시지에 고가 모델 낭비. 가능하면 싼 키 추가';
    base['translate'].tip = '💡 번역에 고가 모델 낭비. 가능하면 싼 키 추가';
  }

  return base;
}

// IDENTITY_SEAL: PART-4 | role=single-key | inputs=provider,model | outputs=strategy

// ============================================================
// PART 5 — Model Recommendation
// ============================================================

export function recommendSecondKey(currentProvider: string): { provider: string; model: string; reason: string } {
  // For cross-model verification, recommend a different provider
  const recommendations: Record<string, { provider: string; model: string; reason: string }> = {
    'anthropic': { provider: 'openai', model: 'gpt-5.4-mini', reason: 'Claude 생성 → GPT 검증 (다른 편향)' },
    'openai': { provider: 'anthropic', model: 'claude-haiku-4-5', reason: 'GPT 생성 → Claude 검증 (다른 편향)' },
    'google': { provider: 'anthropic', model: 'claude-haiku-4-5', reason: 'Gemini 생성 → Claude 검증 (코드 품질↑)' },
    'groq': { provider: 'google', model: 'gemini-2.5-flash', reason: 'Groq 생성 → Gemini 검증 (무료 조합)' },
    'ollama': { provider: 'groq', model: 'llama-3.3-70b', reason: '로컬 생성 → Groq 검증 (무료 + 온라인)' },
  };

  return recommendations[currentProvider] ?? { provider: 'openai', model: 'gpt-5.4-mini', reason: '범용 검증용' };
}

export function printAIProfileSummary(): string {
  const lines: string[] = ['🦔 AI 모델 프로필\n'];

  for (const p of AI_PROFILES) {
    const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(10 - n);
    lines.push(`  ${p.provider}/${p.model} (${p.costTier}, ${p.speed})`);
    lines.push(`    코드:${stars(p.codeQuality)} 추론:${stars(p.reasoning)}`);
    lines.push(`    지시:${stars(p.instruction)} 창의:${stars(p.creativity)} 일관:${stars(p.consistency)}`);
    lines.push(`    적합: ${p.bestFor.join(', ')}`);
    lines.push('');
  }

  return lines.join('\n');
}

// IDENTITY_SEAL: PART-5 | role=recommendation | inputs=currentProvider | outputs=recommendation
