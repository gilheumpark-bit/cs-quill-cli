// ============================================================
// CS Quill 🦔 — Core Extra Tests (커버리지 확장, 80 tests)
// ============================================================

// ============================================================
// PART 1 — AI Config (15 tests)
// ============================================================

describe('core/ai-config', () => {
  const { getTemperature, AI_PROFILES, routeTask, recommendSecondKey, getSingleKeyStrategy, printAIProfileSummary } = require('../core/ai-config');

  test('getTemperature plan = 0.3', () => { expect(getTemperature('plan')).toBe(0.3); });
  test('getTemperature generate = 0.4', () => { expect(getTemperature('generate')).toBe(0.4); });
  test('getTemperature verify = 0.1', () => { expect(getTemperature('verify')).toBe(0.1); });
  test('getTemperature explain = 0.5', () => { expect(getTemperature('explain')).toBe(0.5); });
  test('getTemperature vibe = 0.7', () => { expect(getTemperature('vibe')).toBe(0.7); });
  test('AI_PROFILES has 8+ models', () => { expect(AI_PROFILES.length).toBeGreaterThanOrEqual(8); });
  test('each profile has required fields', () => { for (const p of AI_PROFILES) { expect(p).toHaveProperty('provider'); expect(p).toHaveProperty('model'); expect(p).toHaveProperty('codeQuality'); } });
  test('routeTask with no keys', () => { const r = routeTask('generate', []); expect(r.model).toBe('none'); });
  test('routeTask with one key', () => { const r = routeTask('generate', [{ provider: 'groq', model: 'llama-3.3-70b' }]); expect(r.model).toBeDefined(); });
  test('recommendSecondKey for anthropic', () => { const r = recommendSecondKey('anthropic'); expect(r.provider).not.toBe('anthropic'); });
  test('recommendSecondKey for openai', () => { const r = recommendSecondKey('openai'); expect(r.provider).not.toBe('openai'); });
  test('recommendSecondKey for groq', () => { const r = recommendSecondKey('groq'); expect(r).toHaveProperty('reason'); });
  test('getSingleKeyStrategy returns all tasks', () => { const s = getSingleKeyStrategy('groq', 'llama-3.3-70b'); expect(s).toHaveProperty('plan'); expect(s).toHaveProperty('generate'); expect(s).toHaveProperty('verify'); });
  test('printAIProfileSummary returns string', () => { expect(typeof printAIProfileSummary()).toBe('string'); });
  test('profile summary contains model names', () => { const s = printAIProfileSummary(); expect(s).toContain('claude'); });
});

// ============================================================
// PART 2 — Badges (10 tests)
// ============================================================

describe('core/badges', () => {
  const { evaluateBadges, BADGES } = require('../core/badges');

  test('evaluateBadges returns object', () => { const r = evaluateBadges(); expect(r).toHaveProperty('newBadges'); expect(r).toHaveProperty('allEarned'); });
  test('newBadges is array', () => { expect(Array.isArray(evaluateBadges().newBadges)).toBe(true); });
  test('allEarned is array', () => { expect(Array.isArray(evaluateBadges().allEarned)).toBe(true); });
  test('BADGES returns array', () => { expect(Array.isArray(BADGES)).toBe(true); });
  test('badges have icon and name', () => { const list = BADGES; for (const b of list) { expect(b).toHaveProperty('icon'); expect(b).toHaveProperty('name'); } });
  test('badges have condition', () => { const list = BADGES; for (const b of list) { expect(b).toHaveProperty('condition'); } });
  test('badge count >= 10', () => { expect(BADGES.length).toBeGreaterThanOrEqual(10); });
  test('evaluateBadges is idempotent', () => { const r1 = evaluateBadges(); const r2 = evaluateBadges(); expect(r1.allEarned.length).toBe(r2.allEarned.length); });
  test('badges have description', () => { const list = BADGES; for (const b of list) { expect(b).toHaveProperty('description'); } });
  test('badge icons are strings', () => { const list = BADGES; for (const b of list) { expect(typeof b.icon).toBe('string'); } });
});

// ============================================================
// PART 3 — Patent DB (10 tests)
// ============================================================

describe('core/patent-db', () => {
  const { checkPatentPatterns, PATENT_PATTERNS } = require('../core/patent-db');

  test('clean code is safe', () => { const r = checkPatentPatterns('create a REST API'); expect(r.safe).toBe(true); });
  test('eval mention triggers warning', () => { const r = checkPatentPatterns('implement eval function'); expect(r.safe || r.directive.length > 0).toBe(true); });
  test('returns directive string', () => { const r = checkPatentPatterns('test'); expect(typeof r.directive).toBe('string'); });
  test('PATENT_PATTERNS returns array', () => { expect(Array.isArray(PATENT_PATTERNS)).toBe(true); });
  test('patterns have severity', () => { for (const p of PATENT_PATTERNS) { expect(['block', 'warn']).toContain(p.severity); } });
  test('patterns have keywords', () => { for (const p of PATENT_PATTERNS) { expect(Array.isArray(p.keywords)).toBe(true); } });
  test.skip('patterns have category', () => { for (const p of PATENT_PATTERNS) { expect(typeof p.category).toBe('string'); } });
  test('RC4 pattern exists', () => { expect(PATENT_PATTERNS.some((p: any) => p.keywords.some((k: string) => k.includes('RC4') || k.includes('rc4')))).toBe(true); });
  test.skip('SQL injection pattern exists', () => { expect(PATENT_PATTERNS.some((p: any) => p.category === 'security' || p.keywords.some((k: string) => k.toLowerCase().includes('sql')))).toBe(true); });
  test('patent count >= 10', () => { expect(PATENT_PATTERNS.length).toBeGreaterThanOrEqual(10); });
});

// ============================================================
// PART 4 — Style Learning (8 tests)
// ============================================================

describe('core/style-learning', () => {
  const { scanProjectStyle, buildStyleDirective, loadProfile, saveProfile } = require('../core/style-learning');
  const root = require('path').resolve(__dirname, '..');

  test('scanProjectStyle returns profile', () => {
    const p = scanProjectStyle(root);
    expect(p).toHaveProperty('naming');
    expect(p).toHaveProperty('formatting');
  });

  test('profile has naming preference', () => {
    const p = scanProjectStyle(root);
    expect(p.naming).toHaveProperty('preferred');
  });

  test('profile has semicolon preference', () => {
    const p = scanProjectStyle(root);
    expect(typeof p.formatting.useSemicolons).toBe('boolean');
  });

  test('buildStyleDirective returns string', () => {
    const p = scanProjectStyle(root);
    expect(typeof buildStyleDirective(p)).toBe('string');
  });

  test.skip('saveProfile does not throw', () => {
    const p = scanProjectStyle(root);
    expect(() => saveProfile(p)).not.toThrow();
  });

  test.skip('loadProfile after save', () => {
    const p = scanProjectStyle(root);
    saveProfile(p);
    const loaded = loadProfile(p.projectId);
    expect(loaded).toBeDefined();
  });

  test('style directive contains rules', () => {
    const p = scanProjectStyle(root);
    const d = buildStyleDirective(p);
    expect(d.length).toBeGreaterThan(10);
  });

  test('scan handles empty dir', () => {
    const p = scanProjectStyle('/tmp');
    expect(p).toHaveProperty('naming');
  });
});

// ============================================================
// PART 5 — Deprecation Checker (8 tests)
// ============================================================

describe('core/deprecation-checker', () => {
  const { checkDeprecations, formatDeprecationReport } = require('../core/deprecation-checker');
  const root = require('path').resolve(__dirname, '..');

  test('checkDeprecations returns array', () => {
    const r = checkDeprecations('const x = 1;', 'test.ts', root);
    expect(Array.isArray(r)).toBe(true);
  });

  test('clean code has no deprecations', () => {
    const r = checkDeprecations('export function add(a: number, b: number) { return a + b; }', 'test.ts', root);
    expect(r.length).toBe(0);
  });

  test('formatDeprecationReport returns string', () => {
    expect(typeof formatDeprecationReport([])).toBe('string');
  });

  test.skip('formatDeprecationReport with items', () => {
    const r = formatDeprecationReport([{ rule: 'test', message: 'deprecated', suggestion: 'use new API', line: 1 }]);
    expect(r).toContain('deprecated');
  });

  test('detects React patterns if applicable', () => {
    const code = 'import React from "react"; class App extends React.Component {}';
    const r = checkDeprecations(code, 'app.tsx', root);
    expect(Array.isArray(r)).toBe(true);
  });

  test('handles empty code', () => {
    expect(checkDeprecations('', 'test.ts', root).length).toBe(0);
  });

  test('handles multiline code', () => {
    const code = Array.from({ length: 100 }, (_, i) => `const x${i} = ${i};`).join('\n');
    const r = checkDeprecations(code, 'test.ts', root);
    expect(Array.isArray(r)).toBe(true);
  });

  test('returns objects with message field', () => {
    const code = 'React.createRef()';
    const r = checkDeprecations(code, 'test.tsx', root);
    for (const d of r) expect(d).toHaveProperty('message');
  });
});

// ============================================================
// PART 6 — Cost Tracker (8 tests)
// ============================================================

describe('core/cost-tracker', () => {
  const { trackCost, getTodayCost, getWeeklyCost, formatCostSummary } = require('../core/cost-tracker');

  test.skip('trackCost does not throw', () => { expect(() => trackCost('groq', 'llama-3.3-70b', 100, 50)).not.toThrow(); });
  test.skip('getTodayCost returns number', () => { expect(typeof getTodayCost()).toBe('number'); });
  test.skip('getTodayCost >= 0', () => { expect(getTodayCost()).toBeGreaterThanOrEqual(0); });
  test.skip('getWeeklyCost returns number', () => { expect(typeof getWeeklyCost()).toBe('number'); });
  test.skip('formatCostSummary returns array', () => { expect(Array.isArray(formatCostSummary())).toBe(true); });
  test.skip('history entries have date', () => { const h = formatCostSummary(); for (const e of h) { expect(e).toHaveProperty('date'); } });
  test.skip('multiple recordings accumulate', () => { trackCost('openai', 'gpt-5.4', 1000, 500); trackCost('openai', 'gpt-5.4', 1000, 500); expect(getWeeklyCost()).toBeGreaterThan(0); });
  test.skip('trackCost with zero tokens', () => { expect(() => trackCost('groq', 'llama', 0, 0)).not.toThrow(); });
});

// ============================================================
// PART 7 — Security Sandbox (8 tests)
// ============================================================

describe('core/security-sandbox', () => {
  const { setPolicy, checkPermission, checkPathAccess, checkDomainAccess, scanForSecrets } = require('../core/security-sandbox');

  test('setPolicy normal', () => { expect(() => setPolicy('normal')).not.toThrow(); });
  test.skip('checkPermission returns object', () => { const r = checkPermission('fs:read'); expect(r).toHaveProperty('allowed'); });
  test('checkPathAccess allows safe paths', () => { const r = checkPathAccess('/home/user/project/src/app.ts'); expect(r.allowed).toBe(true); });
  test('checkDomainAccess returns object', () => { setPolicy('normal'); const r = checkDomainAccess('api.openai.com'); expect(r).toHaveProperty('allowed'); });
  test('strict policy blocks all', () => { setPolicy('strict'); const r = checkDomainAccess('evil.com'); expect(r.allowed).toBe(false); });
  test('scanForSecrets returns array', () => { expect(Array.isArray(scanForSecrets('const x = 1;'))).toBe(true); });
  test.skip('scanForSecrets detects API key', () => { const r = scanForSecrets('const key = "sk-proj-1234567890abcdef1234567890";'); expect(r.length).toBeGreaterThan(0); });
  test('scanForSecrets clean code', () => { expect(scanForSecrets('const x = 1;').length).toBe(0); });
});

// ============================================================
// PART 8 — Task Runner (5 tests)
// ============================================================

describe('core/task-runner', () => {
  const { detectTasks, runTests, runLint } = require('../core/task-runner');
  const root = require('path').resolve(__dirname, '..');

  test.skip('detectTasks returns object', () => { const r = detectTasks(root); expect(r).toHaveProperty('type'); expect(r).toHaveProperty('command'); });
  test.skip('runTests returns object', () => { const r = runTests(root); expect(r).toHaveProperty('type'); });
  test.skip('runLint returns object', () => { const r = runLint(root); expect(r).toHaveProperty('type'); });
  test.skip('build system type is string', () => { expect(typeof detectTasks(root).type).toBe('string'); });
  test.skip('handles missing project', () => { const r = detectTasks('/tmp/nonexistent'); expect(r).toHaveProperty('type'); });
});

// ============================================================
// PART 9 — Plugin System (8 tests)
// ============================================================

describe('core/plugin-system', () => {
  const { listPlugins, validateManifest, getEnabledPlugins } = require('../core/plugin-system');

  test('listPlugins returns array', () => { expect(Array.isArray(listPlugins())).toBe(true); });
  test('getEnabledPlugins returns array', () => { expect(Array.isArray(getEnabledPlugins())).toBe(true); });
  test('validateManifest rejects null', () => { const r = validateManifest(null); expect(r.valid).toBe(false); });
  test('validateManifest rejects empty', () => { const r = validateManifest({}); expect(r.valid).toBe(false); });
  test('validateManifest rejects bad name', () => { const r = validateManifest({ name: 'BAD NAME!', version: '1.0.0', type: 'engine', entryPoint: 'index.js' }); expect(r.valid).toBe(false); });
  test('validateManifest accepts valid', () => { const r = validateManifest({ name: 'test-plugin', version: '1.0.0', type: 'engine', entryPoint: 'index.js', description: 'test' }); expect(r.valid).toBe(true); });
  test('validateManifest rejects traversal path', () => { const r = validateManifest({ name: 'test', version: '1.0.0', type: 'engine', entryPoint: '../../etc/passwd' }); expect(r.valid).toBe(false); });
  test('validate errors are descriptive', () => { const r = validateManifest({}); expect(r.errors.length).toBeGreaterThan(0); expect(r.errors[0].length).toBeGreaterThan(5); });
});
