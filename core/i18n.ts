// ============================================================
// CS Quill 🦔 — i18n (다국어 메시지)
// ============================================================
// 에러/상태 메시지를 설정 언어에 맞게 출력.

import { loadMergedConfig } from './config';

// ============================================================
// PART 1 — Message Map
// ============================================================

type MsgKey =
  | 'noFiles' | 'noReceipts' | 'noKeys' | 'noSession'
  | 'pass' | 'fail' | 'warn' | 'skip'
  | 'done' | 'error' | 'saved' | 'deleted'
  | 'generating' | 'verifying' | 'scanning' | 'analyzing'
  | 'addKey' | 'removeKey' | 'selectLang' | 'selectLevel'
  | 'improvement' | 'recommendation'
  | 'auditing' | 'benchmarking' | 'stressTesting' | 'checking'
  | 'learning' | 'explaining' | 'healing' | 'judging'
  | 'noAIKey' | 'offlineMode' | 'sessionExpired' | 'badgeEarned';

const MESSAGES: Record<string, Record<MsgKey, string>> = {
  ko: {
    noFiles: '검증할 파일이 없습니다.',
    noReceipts: '영수증이 없습니다.',
    noKeys: 'API 키가 없습니다. cs config keys-add 로 추가하세요.',
    noSession: '세션이 없습니다.',
    pass: '통과', fail: '실패', warn: '경고', skip: '스킵',
    done: '완료', error: '오류', saved: '저장됨', deleted: '삭제됨',
    generating: '생성 중...', verifying: '검증 중...', scanning: '스캔 중...', analyzing: '분석 중...',
    addKey: 'API 키를 추가하세요', removeKey: '키를 삭제하세요',
    selectLang: '언어를 선택하세요', selectLevel: '경험 수준을 선택하세요',
    improvement: '개선 포인트', recommendation: '추천',
    auditing: '감사 중...', benchmarking: '벤치마크 중...', stressTesting: '부하 테스트 중...', checking: '점검 중...',
    learning: '학습 모드...', explaining: '코드 해설 중...', healing: '자동 수정 중...', judging: '판정 중...',
    noAIKey: 'AI 키 없음. cs config set-key 로 추가하세요.', offlineMode: '오프라인 모드', sessionExpired: '세션 만료됨', badgeEarned: '배지 획득!',
  },
  en: {
    noFiles: 'No files to verify.',
    noReceipts: 'No receipts found.',
    noKeys: 'No API keys. Add with: cs config keys-add',
    noSession: 'No session found.',
    pass: 'PASS', fail: 'FAIL', warn: 'WARN', skip: 'SKIP',
    done: 'Done', error: 'Error', saved: 'Saved', deleted: 'Deleted',
    generating: 'Generating...', verifying: 'Verifying...', scanning: 'Scanning...', analyzing: 'Analyzing...',
    addKey: 'Add an API key', removeKey: 'Remove a key',
    selectLang: 'Select language', selectLevel: 'Select experience level',
    improvement: 'Improvement', recommendation: 'Recommendation',
    auditing: 'Auditing...', benchmarking: 'Benchmarking...', stressTesting: 'Stress testing...', checking: 'Checking...',
    learning: 'Learning mode...', explaining: 'Explaining code...', healing: 'Auto-healing...', judging: 'Judging...',
    noAIKey: 'No AI key. Add with: cs config set-key', offlineMode: 'Offline mode', sessionExpired: 'Session expired', badgeEarned: 'Badge earned!',
  },
  ja: {
    noFiles: '検証するファイルがありません。',
    noReceipts: 'レシートがありません。',
    noKeys: 'APIキーがありません。cs config keys-add で追加してください。',
    noSession: 'セッションがありません。',
    pass: '合格', fail: '不合格', warn: '警告', skip: 'スキップ',
    done: '完了', error: 'エラー', saved: '保存済', deleted: '削除済',
    generating: '生成中...', verifying: '検証中...', scanning: 'スキャン中...', analyzing: '分析中...',
    addKey: 'APIキーを追加', removeKey: 'キーを削除',
    selectLang: '言語を選択', selectLevel: 'レベルを選択',
    improvement: '改善ポイント', recommendation: 'おすすめ',
    auditing: '監査中...', benchmarking: 'ベンチマーク中...', stressTesting: '負荷テスト中...', checking: 'チェック中...',
    learning: '学習モード...', explaining: 'コード解説中...', healing: '自動修正中...', judging: '判定中...',
    noAIKey: 'AIキーなし。cs config set-keyで追加', offlineMode: 'オフラインモード', sessionExpired: 'セッション期限切れ', badgeEarned: 'バッジ獲得!',
  },
  zh: {
    noFiles: '没有可验证的文件。',
    noReceipts: '没有收据。',
    noKeys: '没有API密钥。使用 cs config keys-add 添加。',
    noSession: '没有会话。',
    pass: '通过', fail: '失败', warn: '警告', skip: '跳过',
    done: '完成', error: '错误', saved: '已保存', deleted: '已删除',
    generating: '生成中...', verifying: '验证中...', scanning: '扫描中...', analyzing: '分析中...',
    addKey: '添加API密钥', removeKey: '删除密钥',
    selectLang: '选择语言', selectLevel: '选择级别',
    improvement: '改进建议', recommendation: '推荐',
    auditing: '审计中...', benchmarking: '基准测试中...', stressTesting: '压力测试中...', checking: '检查中...',
    learning: '学习模式...', explaining: '代码解说中...', healing: '自动修复中...', judging: '判定中...',
    noAIKey: '无AI密钥。使用cs config set-key添加', offlineMode: '离线模式', sessionExpired: '会话已过期', badgeEarned: '获得徽章!',
  },
};

// IDENTITY_SEAL: PART-1 | role=messages | inputs=none | outputs=MESSAGES

// ============================================================
// PART 2 — Getter
// ============================================================

let _cachedLang: string | null = null;

function getLang(): string {
  if (!_cachedLang) {
    try { _cachedLang = loadMergedConfig().language; } catch { _cachedLang = 'ko'; }
  }
  return _cachedLang;
}

export function msg(key: MsgKey): string {
  const lang = getLang();
  return MESSAGES[lang]?.[key] ?? MESSAGES['en'][key] ?? key;
}

export function setLang(lang: string): void {
  _cachedLang = lang;
}

// Aliases for context-builder compatibility
export const t = msg;
export const setLanguage = setLang;

// IDENTITY_SEAL: PART-2 | role=getter | inputs=MsgKey | outputs=string
