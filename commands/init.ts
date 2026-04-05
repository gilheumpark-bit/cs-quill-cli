// ============================================================
// CS Quill 🦔 — cs init command
// ============================================================
// 온보딩: 언어 → 프로젝트 스캔 → API 키 → PART 설정 → 저장

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { saveGlobalConfig, loadGlobalConfig, type _CSConfig, type _KeyConfig } from '../core/config';

// ============================================================
// PART 1 — Framework Detection
// ============================================================

interface DetectedFramework {
  name: string;
  version: string;
}

function detectFrameworks(): DetectedFramework[] {
  const pkgPath = join(process.cwd(), 'package.json');
  if (!existsSync(pkgPath)) return [];

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    const detected: DetectedFramework[] = [];

    const checks: Array<[string, string]> = [
      ['next', 'Next.js'],
      ['react', 'React'],
      ['vue', 'Vue'],
      ['svelte', 'Svelte'],
      ['@angular/core', 'Angular'],
      ['express', 'Express'],
      ['nestjs', 'NestJS'],
      ['tailwindcss', 'Tailwind CSS'],
      ['typescript', 'TypeScript'],
    ];

    for (const [pkg, name] of checks) {
      if (allDeps[pkg]) {
        detected.push({ name, version: allDeps[pkg].replace(/[\^~]/, '') });
      }
    }

    return detected;
  } catch {
    return [];
  }
}

// IDENTITY_SEAL: PART-1 | role=framework-detection | inputs=package.json | outputs=DetectedFramework[]

// ============================================================
// PART 2 — Interactive Init Flow
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
  },
};

async function ask(question: string, defaultValue?: string): Promise<string> {
  const { createInterface } = await import('readline');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    const prompt = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
    rl.question(`        ${prompt}`, answer => {
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

  // Step 2: Framework detection
  const l = LABELS[config.language] ?? LABELS['en'];
  console.log(`  [2/5] ${l.scanning}`);
  const frameworks = detectFrameworks();
  if (frameworks.length > 0) {
    for (const fw of frameworks) {
      console.log(`        ✅ ${fw.name} ${fw.version} ${l.detected}`);
    }
    config.framework = frameworks.map(f => f.name).join(' + ');
  } else {
    console.log(`        ⚠️  ${l.noFramework}`);
  }
  console.log('');

  // Step 3: API Key (interactive)
  console.log(`  [3/5] ${l.apiKey}`);
  if (config.keys.length === 0) {
    const addKey = await ask('API 키 추가? (y/n)', 'y');
    if (addKey === 'y' || addKey === 'Y') {
      console.log('        프로바이더: 1.Anthropic 2.OpenAI 3.Google 4.Groq 5.Ollama');
      const provChoice = await ask('선택', '1');
      const providers: Record<string, string> = { '1': 'anthropic', '2': 'openai', '3': 'google', '4': 'groq', '5': 'ollama' };
      const provider = providers[provChoice] ?? 'anthropic';
      const key = await ask('API 키');
      const roles = await ask('역할 (generate,verify,judge)', 'generate,verify');

      if (key) {
        const { addKey: addKeyFn } = await import('../core/config');
        const defaultModels: Record<string, string> = {
          anthropic: 'claude-sonnet-4-6', openai: 'gpt-5.4-mini', google: 'gemini-2.5-flash',
          groq: 'llama-3.3-70b', ollama: 'llama3',
        };
        addKeyFn(config, {
          id: `${provider}-1`,
          provider: provider as never,
          key,
          model: defaultModels[provider] ?? 'default',
          roles: roles.split(',').map(r => r.trim()),
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
  const levelIcons = { easy: '🟢 Easy', normal: '🟡 Normal', pro: '🔴 Pro' };
  console.log(`        ✅ ${levelIcons[config.level]} 설정됨\n`);

  // Save config
  saveGlobalConfig(config);
  console.log(`  ✅ ${l.saved}: ~/.cs/config.json`);

  // Seed reference DB + 외부 레퍼런스 로드
  const { seedDB, loadExternalReferences } = await import('../core/reference-db');
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
  const { scanProjectStyle, saveProfile } = await import('../core/style-learning');
  const profile = scanProjectStyle(process.cwd());
  saveProfile(profile);
  console.log(`  📐 스타일 프로필 저장 (${profile.naming.preferred}, ${profile.formatting.useSemicolons ? 'semicolons' : 'no-semi'})`);

  console.log(`\n  🦔 ${l.ready}\n`);
}

// IDENTITY_SEAL: PART-2 | role=init-flow | inputs=user-input | outputs=CSConfig
