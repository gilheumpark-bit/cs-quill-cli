// ============================================================
// CS Quill 🦔 — Multi-Language Command Alias
// ============================================================

// ============================================================
// PART 1 — Alias Map
// ============================================================

const ALIAS_MAP: Record<string, string> = {
  // 한국어
  '초기화': 'init',
  '생성': 'generate',
  '검증': 'verify',
  '감사': 'audit',
  '스트레스': 'stress',
  '벤치': 'bench',
  '놀이터': 'playground',
  '설정': 'config',
  '적용': 'apply',
  '되돌리기': 'undo',
  '서버': 'serve',
  '리포트': 'report',
  '설명': 'explain',
  '바이브': 'vibe',
  '스프린트': 'sprint',
  '영수증': 'receipt',
  '컴플라이언스': 'compliance',
  '학습': 'learn',
  '추천': 'suggest',
  '북마크': 'bookmark',
  '프리셋': 'preset',
  '검색': 'search',
  '세션': 'session',
  '디버그': 'debug',

  // 日本語
  '初期化': 'init',
  '生成': 'generate',
  '検証': 'verify',
  '監査': 'audit',
  '設定': 'config',
  '説明': 'explain',

  // 中文
  '初始化': 'init',
  '验证': 'verify',
  '审计': 'audit',
  '配置': 'config',
  '解释': 'explain',

  // Short aliases
  'g': 'generate',
  'v': 'verify',
  'a': 'audit',
  's': 'stress',
  'b': 'bench',
  'p': 'playground',
};

// IDENTITY_SEAL: PART-1 | role=alias-map | inputs=none | outputs=ALIAS_MAP

// ============================================================
// PART 2 — Resolver
// ============================================================

export function resolveAlias(input: string): string {
  return ALIAS_MAP[input] ?? ALIAS_MAP[input.toLowerCase()] ?? input;
}

export function getAllAliases(): Record<string, string> {
  return { ...ALIAS_MAP };
}

export function getAliasesForCommand(command: string): string[] {
  return Object.entries(ALIAS_MAP)
    .filter(([, v]) => v === command)
    .map(([k]) => k);
}

// IDENTITY_SEAL: PART-2 | role=resolver | inputs=string | outputs=string
