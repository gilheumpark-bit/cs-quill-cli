// ============================================================
// CS Quill 🦔 — cs init command
// ============================================================
// 온보딩: 언어 → 프로젝트 스캔 → API 키 → PART 설정 → 저장
// + 동적 프레임워크 감지 (package.json 의존성 기반)
// + 모노레포 구조 감지
// + 테스트 프레임워크 감지

const { existsSync, readFileSync, readdirSync } = require('fs');
const { join } = require('path');
const { saveGlobalConfig, loadGlobalConfig } = require('../core/config');
type CSConfig = import('../core/config').CSConfig;
type KeyConfig = import('../core/config').KeyConfig;

// ============================================================
// PART 1 — Dynamic Framework Detection
// ============================================================

interface DetectedFramework {
  name: string;
  version: string;
  category: 'frontend' | 'backend' | 'css' | 'build' | 'test' | 'language' | 'meta' | 'orm' | 'database' | 'state' | 'api';
}

/**
 * Comprehensive framework-to-category mapping.
 * Instead of a hardcoded 9-item list, we map package names to display names + categories.
 * This covers major ecosystems while still being maintainable.
 */
const KNOWN_FRAMEWORKS: Record<string, { name: string; category: DetectedFramework['category'] }> = {
  // Frontend frameworks
  'next': { name: 'Next.js', category: 'frontend' },
  'react': { name: 'React', category: 'frontend' },
  'react-dom': { name: 'React DOM', category: 'frontend' },
  'vue': { name: 'Vue', category: 'frontend' },
  'nuxt': { name: 'Nuxt', category: 'frontend' },
  'svelte': { name: 'Svelte', category: 'frontend' },
  '@sveltejs/kit': { name: 'SvelteKit', category: 'frontend' },
  '@angular/core': { name: 'Angular', category: 'frontend' },
  'solid-js': { name: 'Solid.js', category: 'frontend' },
  'preact': { name: 'Preact', category: 'frontend' },
  'astro': { name: 'Astro', category: 'frontend' },
  'remix': { name: 'Remix', category: 'frontend' },
  '@remix-run/react': { name: 'Remix', category: 'frontend' },
  'gatsby': { name: 'Gatsby', category: 'frontend' },
  'qwik': { name: 'Qwik', category: 'frontend' },
  '@builder.io/qwik': { name: 'Qwik', category: 'frontend' },
  'htmx.org': { name: 'htmx', category: 'frontend' },
  'lit': { name: 'Lit', category: 'frontend' },
  'alpinejs': { name: 'Alpine.js', category: 'frontend' },

  // Backend frameworks
  'express': { name: 'Express', category: 'backend' },
  'fastify': { name: 'Fastify', category: 'backend' },
  'koa': { name: 'Koa', category: 'backend' },
  'hapi': { name: 'Hapi', category: 'backend' },
  '@hapi/hapi': { name: 'Hapi', category: 'backend' },
  '@nestjs/core': { name: 'NestJS', category: 'backend' },
  'nestjs': { name: 'NestJS', category: 'backend' },
  'hono': { name: 'Hono', category: 'backend' },
  'elysia': { name: 'Elysia', category: 'backend' },
  'trpc': { name: 'tRPC', category: 'api' },
  '@trpc/server': { name: 'tRPC', category: 'api' },

  // CSS / Styling
  'tailwindcss': { name: 'Tailwind CSS', category: 'css' },
  'styled-components': { name: 'styled-components', category: 'css' },
  '@emotion/react': { name: 'Emotion', category: 'css' },
  'sass': { name: 'Sass', category: 'css' },
  '@chakra-ui/react': { name: 'Chakra UI', category: 'css' },
  '@mui/material': { name: 'MUI', category: 'css' },
  'antd': { name: 'Ant Design', category: 'css' },
  'bootstrap': { name: 'Bootstrap', category: 'css' },
  'shadcn-ui': { name: 'shadcn/ui', category: 'css' },

  // State management
  'zustand': { name: 'Zustand', category: 'state' },
  'redux': { name: 'Redux', category: 'state' },
  '@reduxjs/toolkit': { name: 'Redux Toolkit', category: 'state' },
  'mobx': { name: 'MobX', category: 'state' },
  'jotai': { name: 'Jotai', category: 'state' },
  'recoil': { name: 'Recoil', category: 'state' },
  'pinia': { name: 'Pinia', category: 'state' },
  'vuex': { name: 'Vuex', category: 'state' },

  // ORM / Database
  'prisma': { name: 'Prisma', category: 'orm' },
  '@prisma/client': { name: 'Prisma', category: 'orm' },
  'drizzle-orm': { name: 'Drizzle', category: 'orm' },
  'typeorm': { name: 'TypeORM', category: 'orm' },
  'sequelize': { name: 'Sequelize', category: 'orm' },
  'mongoose': { name: 'Mongoose', category: 'database' },
  'pg': { name: 'PostgreSQL (pg)', category: 'database' },
  'mysql2': { name: 'MySQL', category: 'database' },
  'redis': { name: 'Redis', category: 'database' },
  'ioredis': { name: 'ioredis', category: 'database' },

  // Build tools
  'vite': { name: 'Vite', category: 'build' },
  'webpack': { name: 'Webpack', category: 'build' },
  'esbuild': { name: 'esbuild', category: 'build' },
  'turbo': { name: 'Turborepo', category: 'build' },
  'tsup': { name: 'tsup', category: 'build' },
  'rollup': { name: 'Rollup', category: 'build' },
  'parcel': { name: 'Parcel', category: 'build' },

  // Language
  'typescript': { name: 'TypeScript', category: 'language' },

  // Test frameworks (detected separately but also caught here)
  'jest': { name: 'Jest', category: 'test' },
  'vitest': { name: 'Vitest', category: 'test' },
  'mocha': { name: 'Mocha', category: 'test' },
  '@playwright/test': { name: 'Playwright', category: 'test' },
  'cypress': { name: 'Cypress', category: 'test' },
  '@testing-library/react': { name: 'Testing Library', category: 'test' },

  // Meta-frameworks
  'electron': { name: 'Electron', category: 'meta' },
  'tauri': { name: 'Tauri', category: 'meta' },
  'react-native': { name: 'React Native', category: 'meta' },
  'expo': { name: 'Expo', category: 'meta' },
};

function detectFrameworks(): DetectedFramework[] {
  const pkgPath = join(process.cwd(), 'package.json');
  if (!existsSync(pkgPath)) return [];

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    const detected: DetectedFramework[] = [];
    const seen = new Set<string>();

    // Phase 1: Match against known frameworks
    for (const [depName, depVersion] of Object.entries(allDeps)) {
      const known = KNOWN_FRAMEWORKS[depName];
      if (known && !seen.has(known.name)) {
        seen.add(known.name);
        detected.push({
          name: known.name,
          version: String(depVersion).replace(/[\^~>=<]/g, ''),
          category: known.category,
        });
      }
    }

    // Phase 2: Detect unknown but significant dependencies
    // Any scoped package starting with @types/ suggests TS usage
    // Any package with > 0 deps not in known list gets noted
    const unknownSignificant = Object.keys(allDeps).filter(dep => {
      if (KNOWN_FRAMEWORKS[dep]) return false;
      if (dep.startsWith('@types/')) return false;
      // Heuristic: scoped packages with "framework-like" names
      if (dep.startsWith('@') && /\/(core|cli|server|client|app)$/.test(dep)) return true;
      return false;
    });

    for (const dep of unknownSignificant.slice(0, 5)) {
      if (!seen.has(dep)) {
        seen.add(dep);
        detected.push({
          name: dep,
          version: String(allDeps[dep]).replace(/[\^~>=<]/g, ''),
          category: 'meta',
        });
      }
    }

    return detected;
  } catch {
    return [];
  }
}

// IDENTITY_SEAL: PART-1 | role=framework-detection | inputs=package.json | outputs=DetectedFramework[]

// ============================================================
// PART 2 — Monorepo Detection
// ============================================================

interface MonorepoInfo {
  type: 'none' | 'npm-workspaces' | 'yarn-workspaces' | 'pnpm-workspaces' | 'lerna' | 'turborepo' | 'nx';
  workspaces: string[];
  packages: string[];
}

function detectMonorepo(): MonorepoInfo {
  const cwd = process.cwd();
  const result: MonorepoInfo = { type: 'none', workspaces: [], packages: [] };

  try {
    // Check for Turborepo
    const turboPath = join(cwd, 'turbo.json');
    if (existsSync(turboPath)) {
      result.type = 'turborepo';
    }

    // Check for Nx
    const nxPath = join(cwd, 'nx.json');
    if (existsSync(nxPath)) {
      result.type = 'nx';
    }

    // Check for Lerna
    const lernaPath = join(cwd, 'lerna.json');
    if (existsSync(lernaPath)) {
      result.type = 'lerna';
      try {
        const lerna = JSON.parse(readFileSync(lernaPath, 'utf-8'));
        if (lerna.packages) result.workspaces = lerna.packages;
      } catch { /* skip */ }
    }

    // Check for pnpm workspaces
    const pnpmWsPath = join(cwd, 'pnpm-workspace.yaml');
    if (existsSync(pnpmWsPath)) {
      result.type = result.type === 'none' ? 'pnpm-workspaces' : result.type;
      try {
        const content = readFileSync(pnpmWsPath, 'utf-8');
        const matches = content.match(/-\s+['"]?([^'":\n]+)['"]?/g);
        if (matches) {
          result.workspaces = matches.map(m => m.replace(/^-\s+['"]?/, '').replace(/['"]?$/, ''));
        }
      } catch { /* skip */ }
    }

    // Check package.json workspaces
    const pkgPath = join(cwd, 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      if (pkg.workspaces) {
        const ws = Array.isArray(pkg.workspaces) ? pkg.workspaces : pkg.workspaces.packages ?? [];
        if (ws.length > 0) {
          result.workspaces = ws;
          if (result.type === 'none') {
            // Detect yarn vs npm workspaces
            const yarnLock = existsSync(join(cwd, 'yarn.lock'));
            result.type = yarnLock ? 'yarn-workspaces' : 'npm-workspaces';
          }
        }
      }
    }

    // Resolve workspace globs to actual package names
    if (result.workspaces.length > 0) {
      for (const ws of result.workspaces) {
        const wsBase = ws.replace(/\/?\*$/, '');
        const wsDir = join(cwd, wsBase);
        if (existsSync(wsDir)) {
          try {
            const entries = readdirSync(wsDir, { withFileTypes: true });
            for (const entry of entries) {
              if (!entry.isDirectory()) continue;
              const subPkg = join(wsDir, entry.name, 'package.json');
              if (existsSync(subPkg)) {
                try {
                  const sub = JSON.parse(readFileSync(subPkg, 'utf-8'));
                  result.packages.push(sub.name ?? entry.name);
                } catch {
                  result.packages.push(entry.name);
                }
              }
            }
          } catch { /* skip */ }
        }
      }
    }
  } catch { /* skip */ }

  return result;
}

// IDENTITY_SEAL: PART-2 | role=monorepo-detection | inputs=cwd | outputs=MonorepoInfo

// ============================================================
// PART 3 — Test Framework Detection
// ============================================================

interface TestFrameworkInfo {
  framework: string | null;
  configFile: string | null;
  testDirs: string[];
  hasTestScript: boolean;
}

function detectTestFramework(): TestFrameworkInfo {
  const cwd = process.cwd();
  const result: TestFrameworkInfo = { framework: null, configFile: null, testDirs: [], hasTestScript: false };

  try {
    const pkgPath = join(cwd, 'package.json');
    if (!existsSync(pkgPath)) return result;

    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

    // Check scripts for test runner hints
    const scripts = pkg.scripts ?? {};
    if (scripts.test && scripts.test !== 'echo "Error: no test specified" && exit 1') {
      result.hasTestScript = true;
    }

    // Detect test framework from dependencies
    const testFrameworks: Array<{ dep: string; name: string; configs: string[] }> = [
      { dep: 'vitest', name: 'Vitest', configs: ['vitest.config.ts', 'vitest.config.js', 'vitest.config.mts'] },
      { dep: 'jest', name: 'Jest', configs: ['jest.config.ts', 'jest.config.js', 'jest.config.json', 'jest.config.mjs'] },
      { dep: 'mocha', name: 'Mocha', configs: ['.mocharc.yml', '.mocharc.json', '.mocharc.js'] },
      { dep: '@playwright/test', name: 'Playwright', configs: ['playwright.config.ts', 'playwright.config.js'] },
      { dep: 'cypress', name: 'Cypress', configs: ['cypress.config.ts', 'cypress.config.js', 'cypress.json'] },
      { dep: 'ava', name: 'AVA', configs: ['ava.config.js', 'ava.config.cjs'] },
      { dep: 'tap', name: 'Tap', configs: ['.taprc'] },
      { dep: 'jasmine', name: 'Jasmine', configs: ['jasmine.json', 'spec/support/jasmine.json'] },
    ];

    for (const tf of testFrameworks) {
      if (allDeps[tf.dep]) {
        result.framework = tf.name;
        // Check for config file
        for (const configFile of tf.configs) {
          if (existsSync(join(cwd, configFile))) {
            result.configFile = configFile;
            break;
          }
        }
        break;
      }
    }

    // Also detect from test script content if not found via deps
    if (!result.framework && result.hasTestScript) {
      const testScript = scripts.test;
      if (/vitest/.test(testScript)) result.framework = 'Vitest';
      else if (/jest/.test(testScript)) result.framework = 'Jest';
      else if (/mocha/.test(testScript)) result.framework = 'Mocha';
      else if (/playwright/.test(testScript)) result.framework = 'Playwright';
      else if (/cypress/.test(testScript)) result.framework = 'Cypress';
    }

    // Detect test directories
    const testDirCandidates = ['test', 'tests', '__tests__', 'spec', 'specs', 'e2e', 'cypress'];
    for (const dir of testDirCandidates) {
      if (existsSync(join(cwd, dir))) {
        result.testDirs.push(dir);
      }
    }
  } catch { /* skip */ }

  return result;
}

// IDENTITY_SEAL: PART-3 | role=test-detection | inputs=cwd | outputs=TestFrameworkInfo

// ============================================================
// PART 4 — Interactive Init Flow
// ============================================================

const LABELS: Record<string, Record<string, string>> = {
  ko: {
    welcome: '🦔 CS Quill v0.1.0\n',
    langSelect: '언어를 선택하세요',
    scanning: '프로젝트 스캔 중...',
    detected: '감지됨',
    noFramework: '프레임워크 감지 안 됨',
    apiKey: 'API 키를 입력하세요',
    provider: '프로바이더',
    role: '역할 (generate, verify, judge)',
    structure: '코드 구조 (auto/on/off)',
    level: '경험 수준',
    saved: '설정 저장 완료',
    ready: '준비 완료. "cs 생성 아무거나" 로 시작하세요.',
    step: '단계',
    monorepo: '모노레포',
    testFramework: '테스트 프레임워크',
  },
  en: {
    welcome: '🦔 CS Quill v0.1.0\n',
    langSelect: 'Select language',
    scanning: 'Scanning project...',
    detected: 'detected',
    noFramework: 'No framework detected',
    apiKey: 'Enter API key',
    provider: 'Provider',
    role: 'Role (generate, verify, judge)',
    structure: 'Code structure (auto/on/off)',
    level: 'Experience level',
    saved: 'Settings saved',
    ready: 'Ready. Start with "cs generate anything".',
    step: 'Step',
    monorepo: 'Monorepo',
    testFramework: 'Test framework',
  },
};

async function ask(question: string, defaultValue?: string): Promise<string> {
  const { createInterface } = require('readline');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    const prompt = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
    rl.question(`        ${prompt}`, (answer: string) => {
      rl.close();
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

export async function runInit(): Promise<void> {
  const config = loadGlobalConfig();

  console.log('🦔 CS Quill v0.1.0\n');

  // Step 1: Language (interactive)
  console.log('  [1/5] 언어 선택 / Select Language');
  console.log('        1. 한국어 (ko)');
  console.log('        2. English (en)');
  console.log('        3. 日本語 (ja)');
  console.log('        4. 中文 (zh)');
  const langChoice = await ask('선택', '1');
  const langMap: Record<string, 'ko' | 'en' | 'ja' | 'zh'> = { '1': 'ko', '2': 'en', '3': 'ja', '4': 'zh', 'ko': 'ko', 'en': 'en', 'ja': 'ja', 'zh': 'zh' };
  config.language = langMap[langChoice] ?? 'ko';
  console.log(`        ✅ ${config.language} 설정됨\n`);

  // Step 2: Framework + Monorepo + Test detection
  const l = LABELS[config.language] ?? LABELS['en'];
  console.log(`  [2/5] ${l.scanning}`);

  // 2a: Frameworks (dynamic)
  const frameworks = detectFrameworks();
  if (frameworks.length > 0) {
    // Group by category
    const byCategory = new Map<string, DetectedFramework[]>();
    for (const fw of frameworks) {
      const existing = byCategory.get(fw.category) ?? [];
      existing.push(fw);
      byCategory.set(fw.category, existing);
    }

    const categoryLabels: Record<string, string> = {
      frontend: '🖥️  프론트엔드',
      backend: '⚙️  백엔드',
      css: '🎨 스타일링',
      build: '🔧 빌드',
      test: '🧪 테스트',
      language: '📝 언어',
      meta: '📦 메타',
      orm: '🗄️  ORM',
      database: '💾 데이터베이스',
      state: '🔄 상태관리',
      api: '🌐 API',
    };

    for (const [category, fws] of byCategory) {
      const label = categoryLabels[category] ?? category;
      const items = fws.map(f => `${f.name} ${f.version}`).join(', ');
      console.log(`        ✅ ${label}: ${items}`);
    }

    config.framework = frameworks
      .filter(f => ['frontend', 'backend', 'language'].includes(f.category))
      .map(f => f.name).join(' + ') || frameworks.map(f => f.name).join(' + ');
  } else {
    console.log(`        ⚠️  ${l.noFramework}`);
  }

  // 2b: Monorepo detection
  const monorepo = detectMonorepo();
  if (monorepo.type !== 'none') {
    console.log(`        📁 ${l.monorepo}: ${monorepo.type}`);
    if (monorepo.packages.length > 0) {
      const pkgList = monorepo.packages.slice(0, 8).join(', ');
      const suffix = monorepo.packages.length > 8 ? ` +${monorepo.packages.length - 8}개 더` : '';
      console.log(`           패키지: ${pkgList}${suffix}`);
    }
  }

  // 2c: Test framework detection
  const testInfo = detectTestFramework();
  if (testInfo.framework) {
    const configNote = testInfo.configFile ? ` (${testInfo.configFile})` : '';
    const dirsNote = testInfo.testDirs.length > 0 ? ` [${testInfo.testDirs.join(', ')}]` : '';
    console.log(`        🧪 ${l.testFramework}: ${testInfo.framework}${configNote}${dirsNote}`);
  }

  console.log('');

  // Step 3: API Key (interactive)
  console.log(`  [3/5] ${l.apiKey}`);
  if (config.keys.length === 0) {
    const addKeyAnswer = await ask('API 키 추가? (y/n)', 'y');
    if (addKeyAnswer === 'y' || addKeyAnswer === 'Y') {
      console.log('        프로바이더: 1.Anthropic 2.OpenAI 3.Google 4.Groq 5.Ollama');
      const provChoice = await ask('선택', '1');
      const providers: Record<string, string> = { '1': 'anthropic', '2': 'openai', '3': 'google', '4': 'groq', '5': 'ollama' };
      const provider = providers[provChoice] ?? 'anthropic';
      const key = await ask('API 키');
      const roles = await ask('역할 (generate,verify,judge)', 'generate,verify');

      if (key) {
        const { addKey: addKeyFn } = require('../core/config');
        const defaultModels: Record<string, string> = {
          anthropic: 'claude-sonnet-4-6', openai: 'gpt-5.4-mini', google: 'gemini-2.5-flash',
          groq: 'llama-3.3-70b', ollama: 'llama3',
        };
        addKeyFn(config, {
          id: `${provider}-1`,
          provider: provider as never,
          key,
          model: defaultModels[provider] ?? 'default',
          roles: roles.split(',').map((r: string) => r.trim()),
        });
        console.log(`        ✅ ${provider} 키 추가됨 → [${roles}]`);
      }
    } else {
      console.log('        (검증/감사는 API 없이 로컬로 실행 가능)');
    }
  } else {
    for (const key of config.keys) {
      console.log(`        ✅ ${key.id} (${key.provider}) → [${key.roles.join(', ')}]`);
    }
  }
  console.log('');

  // Step 4: Structure (interactive)
  console.log(`  [4/5] ${l.structure}`);
  console.log('        1. auto (50줄↓ flat, 100줄↑ part)');
  console.log('        2. on (항상 PART)');
  console.log('        3. off (항상 flat)');
  const structChoice = await ask('선택', '1');
  const structMap: Record<string, 'auto' | 'on' | 'off'> = { '1': 'auto', '2': 'on', '3': 'off' };
  config.structure = structMap[structChoice] ?? 'auto';
  console.log(`        ✅ ${config.structure} 설정됨\n`);

  // Step 5: Level (interactive)
  console.log(`  [5/5] ${l.level}`);
  console.log('        1. 🟢 Easy — 알아서 다 해줘');
  console.log('        2. 🟡 Normal — 중요한 건 물어봐');
  console.log('        3. 🔴 Pro — 내가 다 제어할게');
  const levelChoice = await ask('선택', '2');
  const levelMap: Record<string, 'easy' | 'normal' | 'pro'> = { '1': 'easy', '2': 'normal', '3': 'pro' };
  config.level = levelMap[levelChoice] ?? 'normal';
  const levelIcons: Record<string, string> = { easy: '🟢 Easy', normal: '🟡 Normal', pro: '🔴 Pro' };
  console.log(`        ✅ ${levelIcons[config.level]} 설정됨\n`);

  // Save config
  saveGlobalConfig(config);
  console.log(`  ✅ ${l.saved}: ~/.cs/config.json`);

  // Seed reference DB + 외부 레퍼런스 로드
  const { seedDB, loadExternalReferences } = require('../core/reference-db');
  const seeded = seedDB();
  if (seeded > 0) console.log(`  📚 내장 레퍼런스: ${seeded}개 패턴 추가`);

  // new1/ 외부 레퍼런스 자동 탐색
  const refCandidates = [
    join(process.cwd(), 'new1'),
    join(process.cwd(), '..', 'new1'),
    join(process.cwd(), '..', '..', 'new1'),
  ];
  for (const refPath of refCandidates) {
    if (existsSync(refPath)) {
      const ext = loadExternalReferences(refPath);
      if (ext.loaded > 0) console.log(`  📚 외부 레퍼런스: ${ext.loaded}개 로드 (${refPath.split(/[/\\]/).pop()})`);
      break;
    }
  }

  // Auto-scan style profile
  const { scanProjectStyle, saveProfile } = require('../core/style-learning');
  const profile = scanProjectStyle(process.cwd());
  saveProfile(profile);
  console.log(`  📐 스타일 프로필 저장 (${profile.naming.preferred}, ${profile.formatting.useSemicolons ? 'semicolons' : 'no-semi'})`);

  console.log(`\n  🦔 ${l.ready}\n`);
}

// Export detection functions for use by other commands
export { detectFrameworks, detectMonorepo, detectTestFramework };

// IDENTITY_SEAL: PART-4 | role=init-flow | inputs=user-input | outputs=CSConfig
