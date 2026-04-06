// @ts-nocheck
// ============================================================
// CS Quill 🦔 — cs suggest command
// ============================================================
// 프로젝트 분석 후 개선 추천.

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, _extname } from 'path';

// ============================================================
// PART 1 — Project Analyzer
// ============================================================

interface Suggestion {
  icon: string;
  title: string;
  description: string;
  command: string;
  priority: 'high' | 'medium' | 'low';
}

interface SuggestionWithImpact extends Suggestion {
  impactScore: number; // 0-100 for fine-grained sorting within priority
}

function analyzeProject(): Suggestion[] {
  const suggestions: SuggestionWithImpact[] = [];
  const root = process.cwd();

  // ── Load package.json for deep analysis ──
  const pkgPath = join(root, 'package.json');
  let pkg: any = null;
  let allDeps: Record<string, string> = {};
  if (existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    } catch { /* skip */ }
  }

  // ── Load tsconfig.json for config analysis ──
  let tsconfig: any = null;
  const tsconfigPath = join(root, 'tsconfig.json');
  if (existsSync(tsconfigPath)) {
    try {
      // Strip comments from tsconfig (common non-standard JSON)
      const raw = readFileSync(tsconfigPath, 'utf-8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      tsconfig = JSON.parse(raw);
    } catch { /* skip */ }
  }

  // ── Count source files and structure ──
  let totalFiles = 0;
  let totalLines = 0;
  const dirStructure = new Set<string>();
  function scanStructure(dir: string): void {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name === 'node_modules' || e.name === '.git' || e.name === '.next' || e.name.startsWith('.')) continue;
        const full = join(dir, e.name);
        if (e.isDirectory()) {
          dirStructure.add(e.name);
          scanStructure(full);
          continue;
        }
        if (!/\.(ts|tsx|js|jsx)$/.test(e.name)) continue;
        totalFiles++;
        try { totalLines += readFileSync(full, 'utf-8').split('\n').length; } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }
  const srcDir = join(root, 'src');
  if (existsSync(srcDir)) scanStructure(srcDir);

  // ── Check for missing tests ──
  const hasTests = existsSync(join(root, '__tests__')) || existsSync(join(root, 'src/__tests__')) || existsSync(join(root, 'tests'));
  const hasTestFiles = hasTests || Object.keys(allDeps).some(d => ['jest', 'vitest', 'mocha', '@testing-library/react'].includes(d));
  if (!hasTests && !hasTestFiles) {
    suggestions.push({
      icon: '🧪', title: '테스트 없음',
      description: `테스트 코드와 러너 모두 없어요. ${totalFiles}개 소스 파일 대상 테스트가 필요해요.`,
      command: 'cs generate "프로젝트 주요 함수 테스트 코드" --with-tests',
      priority: 'high', impactScore: 95,
    });
  } else if (hasTestFiles && !hasTests) {
    suggestions.push({
      icon: '🧪', title: '테스트 디렉토리 없음',
      description: '테스트 러너는 설치되어 있지만 테스트 파일이 없어요.',
      command: 'cs generate "프로젝트 주요 함수 테스트 코드" --with-tests',
      priority: 'high', impactScore: 85,
    });
  }

  // ── TypeScript strict mode check ──
  if (tsconfig) {
    const co = tsconfig.compilerOptions ?? {};
    if (!co.strict) {
      suggestions.push({
        icon: '🔒', title: 'TypeScript strict 모드 비활성',
        description: 'strict: true가 없으면 any 타입이 암묵적으로 허용되어 런타임 에러 위험이 높아요.',
        command: 'tsconfig.json > compilerOptions > "strict": true',
        priority: 'high', impactScore: 90,
      });
    }
    if (!co.noUncheckedIndexedAccess && co.strict) {
      suggestions.push({
        icon: '🛡️', title: 'noUncheckedIndexedAccess 미설정',
        description: '배열/객체 인덱스 접근 시 undefined 체크를 강제하면 런타임 에러를 줄일 수 있어요.',
        command: 'tsconfig.json > compilerOptions > "noUncheckedIndexedAccess": true',
        priority: 'low', impactScore: 40,
      });
    }
    if (co.target && ['es5', 'es6', 'es2015', 'es2016'].includes(co.target.toLowerCase())) {
      suggestions.push({
        icon: '📦', title: `TypeScript target이 ${co.target}`,
        description: '최신 target (ES2022+)을 사용하면 번들 크기가 줄어들고 성능이 좋아져요.',
        command: 'tsconfig.json > compilerOptions > "target": "ES2022"',
        priority: 'medium', impactScore: 50,
      });
    }
  }

  // ── Dependency analysis ──
  if (pkg) {
    const scripts = pkg.scripts ?? {};

    // Security: outdated or risky deps
    const riskyDeps = ['request', 'node-fetch@1', 'moment', 'lodash'];
    const betterAlternatives: Record<string, string> = {
      request: 'fetch 또는 undici',
      moment: 'date-fns 또는 dayjs',
      lodash: 'lodash-es 또는 네이티브 메서드',
    };
    for (const dep of Object.keys(allDeps)) {
      if (riskyDeps.includes(dep) && betterAlternatives[dep]) {
        suggestions.push({
          icon: '📦', title: `${dep} → 대체 추천`,
          description: `${dep}은 더 이상 권장되지 않아요. ${betterAlternatives[dep]}로 교체 추천.`,
          command: `npm uninstall ${dep} && npm install ${betterAlternatives[dep].split(' ')[0]}`,
          priority: 'medium', impactScore: 60,
        });
      }
    }

    // Missing lint script
    if (!scripts.lint) {
      const hasBiome = !!allDeps['@biomejs/biome'];
      const hasEslint = !!allDeps.eslint;
      if (hasBiome || hasEslint) {
        suggestions.push({
          icon: '🔍', title: 'lint 스크립트 없음 (도구는 설치됨)',
          description: `${hasBiome ? 'Biome' : 'ESLint'}가 설치되어 있지만 lint 스크립트가 없어요.`,
          command: `package.json scripts에 "lint": "${hasBiome ? 'biome check .' : 'eslint .'}" 추가`,
          priority: 'medium', impactScore: 55,
        });
      } else {
        suggestions.push({
          icon: '🔍', title: 'lint 도구 없음',
          description: 'ESLint나 Biome 설정을 추가하면 코드 품질이 올라가요.',
          command: 'cs generate "ESLint 또는 Biome 설정 추가"',
          priority: 'medium', impactScore: 65,
        });
      }
    }

    // Missing test script
    if (!scripts.test) {
      suggestions.push({
        icon: '🧪', title: 'test 스크립트 없음',
        description: '테스트 러너 설정이 없어요.',
        command: 'cs generate "Jest 또는 Vitest 테스트 설정"',
        priority: 'medium', impactScore: 70,
      });
    }

    // Missing build script for TypeScript projects
    if (!scripts.build && tsconfig) {
      suggestions.push({
        icon: '🏗️', title: 'build 스크립트 없음',
        description: 'TypeScript 프로젝트인데 build 스크립트가 없어요.',
        command: 'package.json scripts에 "build": "tsc" 추가',
        priority: 'medium', impactScore: 55,
      });
    }

    // React without React 19 features
    if (allDeps.react) {
      const reactVer = parseInt(String(allDeps.react).replace(/[\^~>=<]*/g, '').split('.')[0], 10);
      if (reactVer >= 19 && allDeps['react-dom'] && !allDeps['next']) {
        // React 19 but no Next.js — suggest server components
        if (!dirStructure.has('app')) {
          suggestions.push({
            icon: '⚛️', title: 'React 19 Server Components 미사용',
            description: 'React 19는 Server Components가 기본이에요. 프레임워크 도입을 고려해보세요.',
            command: 'cs preset show react-19',
            priority: 'low', impactScore: 35,
          });
        }
      }
    }
  }

  // ── Check for missing LICENSE ──
  if (!existsSync(join(root, 'LICENSE')) && !existsSync(join(root, 'LICENSE.md'))) {
    suggestions.push({
      icon: '📜', title: 'LICENSE 파일 없음',
      description: '라이선스 파일이 없으면 다른 사람이 사용할 수 없어요.',
      command: 'cs generate "MIT LICENSE 파일"',
      priority: 'medium', impactScore: 40,
    });
  }

  // ── Check for .env without .env.example ──
  if (existsSync(join(root, '.env')) && !existsSync(join(root, '.env.example'))) {
    suggestions.push({
      icon: '🔐', title: '.env.example 없음',
      description: '.env가 있는데 .env.example이 없어요. 팀원이 어떤 환경변수가 필요한지 모를 수 있어요.',
      command: 'cs generate ".env.example 파일 (실제 값 제외)"',
      priority: 'medium', impactScore: 60,
    });
  }

  // ── Check .gitignore for common omissions ──
  if (existsSync(join(root, '.gitignore'))) {
    try {
      const gitignore = readFileSync(join(root, '.gitignore'), 'utf-8');
      const shouldIgnore = ['.env', 'node_modules', '.next', 'dist', 'build'];
      const missing = shouldIgnore.filter(item => !gitignore.includes(item));
      if (missing.length > 0 && existsSync(join(root, missing[0]))) {
        suggestions.push({
          icon: '🙈', title: `.gitignore에 ${missing[0]} 누락`,
          description: `${missing.join(', ')} 패턴이 .gitignore에 없어요.`,
          command: `.gitignore에 ${missing.join(', ')} 추가`,
          priority: 'high', impactScore: 80,
        });
      }
    } catch { /* skip */ }
  } else if (existsSync(join(root, '.git'))) {
    suggestions.push({
      icon: '🙈', title: '.gitignore 없음',
      description: 'Git 저장소인데 .gitignore가 없어요. node_modules, .env 등이 커밋될 수 있어요.',
      command: 'cs generate ".gitignore 파일 (Node.js)"',
      priority: 'high', impactScore: 85,
    });
  }

  // ── Check for large files ──
  function scanLargeFiles(dir: string): void {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name === 'node_modules' || e.name === '.git' || e.name === '.next' || e.name.startsWith('.')) continue;
        const full = join(dir, e.name);
        if (e.isDirectory()) { scanLargeFiles(full); continue; }
        if (!/\.(ts|tsx|js|jsx)$/.test(e.name)) continue;
        try {
          const content = readFileSync(full, 'utf-8');
          const lineCount = content.split('\n').length;
          if (lineCount > 300) {
            suggestions.push({
              icon: '📏', title: `${e.name} (${lineCount}줄)`,
              description: '파일이 너무 커요. PART 구조로 분리하면 관리하기 쉬워져요.',
              command: `cs explain ${full}`,
              priority: 'low', impactScore: Math.min(50, Math.round(lineCount / 20)),
            });
          }
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }
  if (existsSync(srcDir)) scanLargeFiles(srcDir);

  // ── Check for TODO/FIXME ──
  let todoCount = 0;
  function scanTodos(dir: string): void {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
        const full = join(dir, e.name);
        if (e.isDirectory()) { scanTodos(full); continue; }
        if (!/\.(ts|tsx|js|jsx)$/.test(e.name)) continue;
        try {
          const c = readFileSync(full, 'utf-8');
          todoCount += (c.match(/TODO|FIXME|HACK|XXX/g) ?? []).length;
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }
  if (existsSync(srcDir)) scanTodos(srcDir);
  if (todoCount > 5) {
    suggestions.push({
      icon: '📝', title: `TODO/FIXME ${todoCount}개`,
      description: `미완성 코드가 ${todoCount}개 있어요. ${todoCount > 20 ? '심각한 수준이에요!' : '하나씩 해결해보세요.'}`,
      command: 'cs verify ./src',
      priority: todoCount > 20 ? 'high' : 'medium',
      impactScore: Math.min(80, 40 + todoCount),
    });
  }

  // ── Always suggest playground (low priority) ──
  suggestions.push({
    icon: '🎮', title: '프로젝트 벤치마크',
    description: '코드 품질 점수를 측정해보세요.',
    command: 'cs playground',
    priority: 'low', impactScore: 10,
  });

  // Sort by priority first, then by impactScore within same priority
  return suggestions.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    const priDiff = order[a.priority] - order[b.priority];
    if (priDiff !== 0) return priDiff;
    return b.impactScore - a.impactScore; // higher impact first within same priority
  });
}

// IDENTITY_SEAL: PART-1 | role=analyzer | inputs=project | outputs=Suggestion[]

// ============================================================
// PART 2 — Suggest Runner
// ============================================================

export async function runSuggest(): Promise<void> {
  console.log('🦔 CS Quill — 프로젝트 추천\n');

  const suggestions = analyzeProject();

  if (suggestions.length === 0) {
    console.log('  ✅ 추천할 것이 없어요. 프로젝트가 잘 관리되고 있어요!\n');
    return;
  }

  const priorityIcons = { high: '🔴', medium: '🟡', low: '🟢' };
  const priorityLabels = { high: '높음', medium: '보통', low: '낮음' };

  const highCount = suggestions.filter(s => s.priority === 'high').length;
  const medCount = suggestions.filter(s => s.priority === 'medium').length;
  const lowCount = suggestions.filter(s => s.priority === 'low').length;

  console.log(`  📊 총 ${suggestions.length}개 추천 (🔴 ${highCount} | 🟡 ${medCount} | 🟢 ${lowCount})\n`);

  for (const [i, s] of suggestions.entries()) {
    console.log(`  ${i + 1}. ${s.icon} ${s.title} ${priorityIcons[s.priority]} ${priorityLabels[s.priority]}`);
    console.log(`     ${s.description}`);
    console.log(`     → ${s.command}\n`);
  }
}

// IDENTITY_SEAL: PART-2 | role=suggest-runner | inputs=none | outputs=console
