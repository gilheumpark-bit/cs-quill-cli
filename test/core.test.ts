// ============================================================
// CS Quill 🦔 — Core Module Unit Tests
// ============================================================

import { resolve } from 'path';

// ============================================================
// PART 1 — Config
// ============================================================

describe('core/config', () => {
  const { loadMergedConfig, getGlobalConfigDir, getAIConfig } = require('../core/config');

  test('loadMergedConfig returns object', () => {
    const config = loadMergedConfig();
    expect(config).toBeDefined();
    expect(typeof config).toBe('object');
  });

  test('getGlobalConfigDir returns string path', () => {
    const dir = getGlobalConfigDir();
    expect(typeof dir).toBe('string');
    expect(dir.length).toBeGreaterThan(0);
  });

  test('getAIConfig returns provider/model/apiKey', () => {
    const config = getAIConfig();
    expect(config).toHaveProperty('provider');
    expect(config).toHaveProperty('model');
    expect(config).toHaveProperty('apiKey');
  });
});

// ============================================================
// PART 2 — Loop Guard
// ============================================================

describe('core/loop-guard', () => {
  const { createLoopGuard } = require('../core/loop-guard');

  test('creates guard with default config', () => {
    const guard = createLoopGuard();
    expect(guard).toBeDefined();
    expect(guard.state).toBeDefined();
  });

  test('check returns null on first call', () => {
    const guard = createLoopGuard({ passThreshold: 80 });
    const result = guard.check(50, 0, 0);
    expect(result).toBeNull(); // first round, not enough data
  });

  test('check returns passed when score >= threshold', () => {
    const guard = createLoopGuard({ passThreshold: 80 });
    guard.check(85, 0, 0);
    const result = guard.check(90, 0, 0);
    expect(result).toBe('passed');
  });
});

// ============================================================
// PART 3 — i18n
// ============================================================

describe('core/i18n', () => {
  const { msg, setLang, t } = require('../core/i18n');

  test('msg returns Korean by default', () => {
    setLang('ko');
    expect(msg('pass')).toBe('통과');
    expect(msg('fail')).toBe('실패');
  });

  test('msg returns English', () => {
    setLang('en');
    expect(msg('pass')).toBe('PASS');
    expect(msg('fail')).toBe('FAIL');
  });

  test('msg returns Japanese', () => {
    setLang('ja');
    expect(msg('pass')).toBe('合格');
  });

  test('t is alias for msg', () => {
    expect(t).toBe(msg);
  });

  test('unknown key returns key itself', () => {
    setLang('ko');
    expect(msg('nonexistent_key' as any)).toBe('nonexistent_key');
  });
});

// ============================================================
// PART 4 — Alias
// ============================================================

describe('core/alias', () => {
  const { resolveAlias, getAllAliases, getAliasesForCommand } = require('../core/alias');

  test('Korean aliases resolve correctly', () => {
    expect(resolveAlias('생성')).toBe('generate');
    expect(resolveAlias('검증')).toBe('verify');
    expect(resolveAlias('감사')).toBe('audit');
  });

  test('Short aliases resolve correctly', () => {
    expect(resolveAlias('g')).toBe('generate');
    expect(resolveAlias('v')).toBe('verify');
    expect(resolveAlias('a')).toBe('audit');
  });

  test('Unknown input returns itself', () => {
    expect(resolveAlias('unknown_cmd')).toBe('unknown_cmd');
  });

  test('getAllAliases returns object', () => {
    const all = getAllAliases();
    expect(Object.keys(all).length).toBeGreaterThan(20);
  });

  test('getAliasesForCommand returns array', () => {
    const aliases = getAliasesForCommand('verify');
    expect(aliases).toContain('검증');
    expect(aliases).toContain('v');
  });
});

// ============================================================
// PART 5 — Session
// ============================================================

describe('core/session', () => {
  const { createSession, loadSession, deleteSession, listSessions, recordScore } = require('../core/session');

  let testSessionId: string;

  test('createSession returns session object', () => {
    const session = createSession(process.cwd());
    expect(session).toHaveProperty('id');
    expect(session).toHaveProperty('projectPath');
    expect(session).toHaveProperty('projectName');
    testSessionId = session.id;
  });

  test('loadSession retrieves created session', () => {
    const session = loadSession(testSessionId);
    expect(session).toBeDefined();
    expect(session?.id).toBe(testSessionId);
  });

  test('listSessions includes created session', () => {
    const sessions = listSessions();
    expect(sessions.length).toBeGreaterThan(0);
  });

  test('recordScore accepts verify type', () => {
    expect(() => recordScore('verify', 85)).not.toThrow();
  });

  test('recordScore accepts audit type', () => {
    expect(() => recordScore('audit', 90)).not.toThrow();
  });

  test('deleteSession removes session', () => {
    const result = deleteSession(testSessionId);
    expect(result).toBe(true);
  });
});

// ============================================================
// PART 6 — Constants
// ============================================================

describe('core/constants', () => {
  const constants = require('../core/constants');

  test('exports PASS_THRESHOLD', () => {
    expect(constants.PASS_THRESHOLD).toBe(77);
  });

  test('exports numeric constants', () => {
    expect(typeof constants.MAX_VERIFICATION_ROUNDS).toBe('number');
    expect(typeof constants.API_TIMEOUT_MS).toBe('number');
    expect(typeof constants.DEBOUNCE_MS).toBe('number');
  });
});

// ============================================================
// PART 7 — Terminal Compat
// ============================================================

describe('core/terminal-compat', () => {
  const { detectTerminal, icons, colors, compatProgressBar, printScore } = require('../core/terminal-compat');

  test('detectTerminal returns capabilities', () => {
    const caps = detectTerminal();
    expect(caps).toHaveProperty('supportsColor');
    expect(caps).toHaveProperty('supportsEmoji');
    expect(caps).toHaveProperty('shell');
    expect(caps).toHaveProperty('platform');
  });

  test('icons are strings', () => {
    expect(typeof icons.pass).toBe('string');
    expect(typeof icons.fail).toBe('string');
    expect(typeof icons.quill).toBe('string');
  });

  test('colors.red wraps string', () => {
    const result = colors.red('error');
    expect(result).toContain('error');
  });

  test('compatProgressBar returns string', () => {
    const bar = compatProgressBar(50, 100, 20);
    expect(typeof bar).toBe('string');
    expect(bar.length).toBe(20);
  });
});
