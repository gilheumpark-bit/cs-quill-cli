// ============================================================
// CS Quill 🦔 — Constants (Magic Number 제거)
// ============================================================

// ── Scoring ──
export const PASS_THRESHOLD = 77;
export const STRICT_THRESHOLD = 85;
export const WARN_THRESHOLD = 60;

// ── Pipeline ──
export const MAX_VERIFICATION_ROUNDS = 3;
export const MAX_VERIFICATION_ROUNDS_STRICT = 5;
export const NO_PROGRESS_DELTA = 2;

// ── Limits ──
export const MAX_FILES_SAMPLE = 30;
export const MAX_FINDINGS_DISPLAY = 50;
export const MAX_CONCURRENT_WORKERS = 8;

// ── Cost ──
export const TOKENS_PER_LINE = 15;
export const MAX_CODE_SLICE = 6000;
export const MAX_PROMPT_CONTEXT = 4000;
export const MAX_REFERENCE_LENGTH = 1500;

// ── Time ──
export const DEBOUNCE_MS = 500;
export const API_TIMEOUT_MS = 30000;
export const SANDBOX_TIMEOUT_MS = 5000;
export const WATCH_DEBOUNCE_MS = 500;

// ── Storage ──
export const MAX_FIX_PATTERNS = 500;
export const MAX_SESSION_FILES = 20;
export const MAX_SESSION_RECEIPTS = 50;
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const COST_RETENTION_DAYS = 30;

// ── UI ──
export const PROGRESS_BAR_WIDTH = 20;
export const TABLE_COLUMN_WIDTH = 14;
export const MAX_FILENAME_LENGTH = 40;

// ── Scoring Weights ──
export const IP_CRITICAL_WEIGHT = 25;
export const IP_WARNING_WEIGHT = 10;
export const IP_COPYLEFT_WEIGHT = 15;

// IDENTITY_SEAL: role=constants | inputs=none | outputs=all-constants
