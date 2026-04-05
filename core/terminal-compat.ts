// ============================================================
// CS Quill 🦔 — Terminal Compatibility Layer
// ============================================================
// PowerShell, CMD, bash, zsh, Windows Terminal 전부 지원.
// 이모지/ANSI/유니코드 지원 여부 감지 → 자동 폴백.

// ============================================================
// PART 1 — Terminal Detection
// ============================================================

export interface TerminalCapabilities {
  supportsColor: boolean;
  supports256Color: boolean;
  supportsTrueColor: boolean;
  supportsUnicode: boolean;
  supportsEmoji: boolean;
  supportsBoxDrawing: boolean;
  shell: string;
  platform: string;
  isCI: boolean;
}

export function detectTerminal(): TerminalCapabilities {
  const env = process.env;
  const platform = process.platform;

  // CI detection
  const isCI = !!(env.CI || env.GITHUB_ACTIONS || env.GITLAB_CI || env.JENKINS_URL || env.CIRCLECI);

  // Shell detection
  const shell = detectShell();

  // Color support
  const forceColor = env.FORCE_COLOR;
  const noColor = env.NO_COLOR !== undefined;
  const colorTerm = env.COLORTERM;
  const term = env.TERM ?? '';
  const isWindowsTerminal = !!env.WT_SESSION;
  const isDumbTerminal = term === 'dumb';

  let supportsColor = false;
  let supports256Color = false;
  let supportsTrueColor = false;

  if (noColor || isDumbTerminal) {
    // No color
  } else if (forceColor !== undefined) {
    supportsColor = true;
    supports256Color = parseInt(forceColor, 10) >= 2;
    supportsTrueColor = parseInt(forceColor, 10) >= 3;
  } else if (isWindowsTerminal) {
    supportsColor = true;
    supports256Color = true;
    supportsTrueColor = true;
  } else if (colorTerm === 'truecolor' || colorTerm === '24bit') {
    supportsColor = true;
    supports256Color = true;
    supportsTrueColor = true;
  } else if (term.includes('256color')) {
    supportsColor = true;
    supports256Color = true;
  } else if (platform !== 'win32' || shell !== 'cmd') {
    supportsColor = process.stdout.isTTY ?? false;
  }

  // Unicode support
  const supportsUnicode = platform !== 'win32' || isWindowsTerminal || shell === 'powershell' || shell === 'pwsh' || !!env.WT_SESSION;
  const supportsEmoji = supportsUnicode && (platform !== 'win32' || isWindowsTerminal);
  const supportsBoxDrawing = supportsUnicode;

  return {
    supportsColor, supports256Color, supportsTrueColor,
    supportsUnicode, supportsEmoji, supportsBoxDrawing,
    shell, platform, isCI,
  };
}

function detectShell(): string {
  const env = process.env;

  if (env.PSModulePath && !env.BASH_VERSION) return 'powershell';
  if (env.ZSH_VERSION) return 'zsh';
  if (env.BASH_VERSION) return 'bash';
  if (env.FISH_VERSION) return 'fish';
  if (process.platform === 'win32') {
    if (env.TERM_PROGRAM === 'vscode') return 'vscode';
    if (env.ComSpec?.includes('cmd.exe')) return 'cmd';
    return 'powershell';
  }
  return 'unknown';
}

// IDENTITY_SEAL: PART-1 | role=detection | inputs=process.env | outputs=TerminalCapabilities

// ============================================================
// PART 2 — Icon Fallbacks
// ============================================================

let _caps: TerminalCapabilities | null = null;

function getCaps(): TerminalCapabilities {
  if (!_caps) _caps = detectTerminal();
  return _caps;
}

export const icons = {
  get quill() { return getCaps().supportsEmoji ? '🦔' : '[CS]'; },
  get pass() { return getCaps().supportsEmoji ? '✅' : '[OK]'; },
  get fail() { return getCaps().supportsEmoji ? '❌' : '[FAIL]'; },
  get warn() { return getCaps().supportsEmoji ? '⚠️' : '[WARN]'; },
  get info() { return getCaps().supportsEmoji ? 'ℹ️' : '[INFO]'; },
  get fire() { return getCaps().supportsEmoji ? '🔥' : '[!]'; },
  get lock() { return getCaps().supportsEmoji ? '🔒' : '[LOCK]'; },
  get key() { return getCaps().supportsEmoji ? '🔑' : '[KEY]'; },
  get folder() { return getCaps().supportsEmoji ? '📁' : '[DIR]'; },
  get file() { return getCaps().supportsEmoji ? '📄' : '[FILE]'; },
  get gear() { return getCaps().supportsEmoji ? '⚙️' : '[CFG]'; },
  get rocket() { return getCaps().supportsEmoji ? '🚀' : '[GO]'; },
  get star() { return getCaps().supportsEmoji ? '⭐' : '[*]'; },
  get bug() { return getCaps().supportsEmoji ? '🐛' : '[BUG]'; },
  get shield() { return getCaps().supportsEmoji ? '🛡️' : '[SEC]'; },
  get clock() { return getCaps().supportsEmoji ? '⏱️' : '[TIME]'; },
  get chart() { return getCaps().supportsEmoji ? '📊' : '[DATA]'; },
  get red() { return getCaps().supportsEmoji ? '🔴' : '(!)'; },
  get yellow() { return getCaps().supportsEmoji ? '🟡' : '(~)'; },
  get green() { return getCaps().supportsEmoji ? '🟢' : '(+)'; },
};

// IDENTITY_SEAL: PART-2 | role=icons | inputs=none | outputs=icon-strings

// ============================================================
// PART 3 — Color Fallbacks
// ============================================================

function colorCode(code: string): string {
  return getCaps().supportsColor ? code : '';
}

export const colors = {
  red: (s: string) => `${colorCode('\x1b[31m')}${s}${colorCode('\x1b[0m')}`,
  green: (s: string) => `${colorCode('\x1b[32m')}${s}${colorCode('\x1b[0m')}`,
  yellow: (s: string) => `${colorCode('\x1b[33m')}${s}${colorCode('\x1b[0m')}`,
  blue: (s: string) => `${colorCode('\x1b[34m')}${s}${colorCode('\x1b[0m')}`,
  magenta: (s: string) => `${colorCode('\x1b[35m')}${s}${colorCode('\x1b[0m')}`,
  cyan: (s: string) => `${colorCode('\x1b[36m')}${s}${colorCode('\x1b[0m')}`,
  dim: (s: string) => `${colorCode('\x1b[2m')}${s}${colorCode('\x1b[0m')}`,
  bold: (s: string) => `${colorCode('\x1b[1m')}${s}${colorCode('\x1b[0m')}`,
  reset: '\x1b[0m',
};

// IDENTITY_SEAL: PART-3 | role=colors | inputs=string | outputs=ansi-string

// ============================================================
// PART 4 — Box Drawing Fallbacks
// ============================================================

export const box = {
  get topLeft() { return getCaps().supportsBoxDrawing ? '┌' : '+'; },
  get topRight() { return getCaps().supportsBoxDrawing ? '┐' : '+'; },
  get bottomLeft() { return getCaps().supportsBoxDrawing ? '└' : '+'; },
  get bottomRight() { return getCaps().supportsBoxDrawing ? '┘' : '+'; },
  get horizontal() { return getCaps().supportsBoxDrawing ? '─' : '-'; },
  get vertical() { return getCaps().supportsBoxDrawing ? '│' : '|'; },
  get doubleH() { return getCaps().supportsBoxDrawing ? '═' : '='; },
  get doubleV() { return getCaps().supportsBoxDrawing ? '║' : '|'; },
  get filled() { return getCaps().supportsBoxDrawing ? '█' : '#'; },
  get empty() { return getCaps().supportsBoxDrawing ? '░' : '.'; },
};

// IDENTITY_SEAL: PART-4 | role=box | inputs=none | outputs=box-chars

// ============================================================
// PART 5 — Spinner Fallbacks
// ============================================================

export const spinnerFrames = getCaps().supportsUnicode
  ? ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  : ['|', '/', '-', '\\'];

// IDENTITY_SEAL: PART-5 | role=spinner | inputs=none | outputs=string[]

// ============================================================
// PART 6 — Progress Bar (Compat)
// ============================================================

export function compatProgressBar(current: number, total: number, width: number = 20): string {
  const ratio = Math.min(1, current / Math.max(1, total));
  const filled = Math.round(ratio * width);
  return box.filled.repeat(filled) + box.empty.repeat(width - filled);
}

export function compatDivider(width: number = 52, double: boolean = false): string {
  return (double ? box.doubleH : box.horizontal).repeat(width);
}

// IDENTITY_SEAL: PART-6 | role=progress | inputs=current,total | outputs=string

// ============================================================
// PART 7 — Print Helpers
// ============================================================

export function printHeader(title: string): void {
  const divider = compatDivider(52, true);
  console.log(divider);
  console.log(`  ${icons.quill} ${title}`);
  console.log(divider);
}

export function printScore(label: string, score: number, maxWidth: number = 20): void {
  const bar = compatProgressBar(score, 100, maxWidth);
  const icon = score >= 80 ? icons.pass : score >= 60 ? icons.warn : icons.fail;
  console.log(`  ${icon} ${label.padEnd(14)} ${bar} ${score}/100`);
}

export function printSection(title: string): void {
  console.log(`\n  ${compatDivider(52)}`);
  console.log(`  ${title}`);
}

// IDENTITY_SEAL: PART-7 | role=print-helpers | inputs=various | outputs=console
