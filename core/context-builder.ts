// @ts-nocheck
// ============================================================
// CS Quill 🦔 — Context Builder (명령어 진입 전 자동 래핑)
// ============================================================
// 모든 명령어가 공유하는 실행 컨텍스트를 단일 객체로 조립.
// Preset + Fix-Memory + Style + Config → CommandContext

import { printHeader, printScore, printSection, icons, colors, compatDivider, compatProgressBar } from './terminal-compat';
import { Spinner, ProgressTimer } from '../tui/progress';

// ============================================================
// PART 1 — Types
// ============================================================

export interface CommandContext {
  // UI 헬퍼
  ui: {
    printHeader: typeof printHeader;
    printScore: typeof printScore;
    printSection: typeof printSection;
    icons: typeof icons;
    colors: typeof colors;
    divider: typeof compatDivider;
    progressBar: typeof compatProgressBar;
    spinner: (label: string) => Spinner;
    timer: (label: string, total: number) => ProgressTimer;
  };
  // i18n
  t: (key: string) => string;
  lang: string;
  // 프로젝트 컨텍스트
  cwd: string;
  projectName: string;
  framework?: string;
  // AI 컨텍스트 주입용
  presetDirective: string;
  pastMistakes: string;
  styleDirective: string;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=CommandContext

// ============================================================
// PART 2 — Builder
// ============================================================

let _cachedCtx: CommandContext | null = null;

export async function buildCommandContext(cwd?: string): Promise<CommandContext> {
  if (_cachedCtx && _cachedCtx.cwd === (cwd ?? process.cwd())) return _cachedCtx;

  const workDir = cwd ?? process.cwd();
  const projectName = workDir.split(/[/\\]/).pop() ?? 'unknown';

  // Config
  let framework: string | undefined;
  let lang = 'ko';
  try {
    const { loadMergedConfig } = await import('./config');
    const config = loadMergedConfig();
    framework = config.framework;
    lang = config.language ?? 'ko';
  } catch { /* no config */ }

  // i18n
  let translate: (key: string) => string;
  try {
    const { t, setLanguage } = await import('./i18n');
    setLanguage(lang);
    translate = t;
  } catch {
    translate = (key: string) => key;
  }

  // Preset directive
  let presetDirective = '';
  try {
    const { getPresetsForFramework, buildPresetDirective } = await import('../commands/preset');
    if (framework) {
      const presets = getPresetsForFramework(framework);
      presetDirective = buildPresetDirective(presets);
    }
  } catch { /* no presets */ }

  // Fix-memory (과거 실수 기록)
  let pastMistakes = '';
  try {
    const { getTopPatterns } = await import('./fix-memory');
    const patterns = getTopPatterns(5);
    if (patterns.length > 0) {
      pastMistakes = '[AVOID_MISTAKES]\n' + patterns.map(p => `- ${p.description}: ${p.beforePattern} → ${p.afterPattern} (신뢰도: ${Math.round(p.confidence * 100)}%)`).join('\n');
    }
  } catch { /* no memory */ }

  // Style directive
  let styleDirective = '';
  try {
    const { loadProfile, buildStyleDirective } = await import('./style-learning');
    const profile = loadProfile(projectName);
    if (profile) styleDirective = buildStyleDirective(profile);
  } catch { /* no style */ }

  _cachedCtx = {
    ui: {
      printHeader,
      printScore,
      printSection,
      icons,
      colors,
      divider: compatDivider,
      progressBar: compatProgressBar,
      spinner: (label: string) => new Spinner(label),
      timer: (label: string, total: number) => new ProgressTimer(label, total),
    },
    t: translate,
    lang,
    cwd: workDir,
    projectName,
    framework,
    presetDirective,
    pastMistakes,
    styleDirective,
  };

  return _cachedCtx;
}

export function invalidateContext(): void {
  _cachedCtx = null;
}

// IDENTITY_SEAL: PART-2 | role=builder | inputs=cwd | outputs=CommandContext

// ============================================================
// PART 3 — AI System Header 조립
// ============================================================

export function buildAISystemHeader(ctx: CommandContext): string {
  const parts: string[] = [];

  if (ctx.presetDirective) parts.push(ctx.presetDirective);
  if (ctx.styleDirective) parts.push(ctx.styleDirective);
  if (ctx.pastMistakes) parts.push(ctx.pastMistakes);

  return parts.join('\n\n');
}

// IDENTITY_SEAL: PART-3 | role=ai-header | inputs=CommandContext | outputs=string
