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

function analyzeProject(): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const root = process.cwd();

  // Check for missing tests
  const hasTests = existsSync(join(root, '__tests__')) || existsSync(join(root, 'src/__tests__')) || existsSync(join(root, 'tests'));
  if (!hasTests) {
    suggestions.push({
      icon: '🧪', title: '테스트 없음',
      description: '테스트 코드가 없어요. AI가 자동으로 테스트를 생성할 수 있어요.',
      command: 'cs generate "프로젝트 주요 함수 테스트 코드" --with-tests',
      priority: 'high',
    });
  }

  // Check for missing LICENSE
  if (!existsSync(join(root, 'LICENSE')) && !existsSync(join(root, 'LICENSE.md'))) {
    suggestions.push({
      icon: '📜', title: 'LICENSE 파일 없음',
      description: '라이선스 파일이 없으면 다른 사람이 사용할 수 없어요.',
      command: 'cs generate "MIT LICENSE 파일"',
      priority: 'medium',
    });
  }

  // Check for .env without .env.example
  if (existsSync(join(root, '.env')) && !existsSync(join(root, '.env.example'))) {
    suggestions.push({
      icon: '🔐', title: '.env.example 없음',
      description: '.env가 있는데 .env.example이 없어요. 팀원이 어떤 환경변수가 필요한지 모를 수 있어요.',
      command: 'cs generate ".env.example 파일 (실제 값 제외)"',
      priority: 'medium',
    });
  }

  // Check package.json for missing scripts
  const pkgPath = join(root, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const scripts = pkg.scripts ?? {};

      if (!scripts.lint) {
        suggestions.push({
          icon: '🔍', title: 'lint 스크립트 없음',
          description: 'ESLint나 Biome 설정을 추가하면 코드 품질이 올라가요.',
          command: 'cs generate "ESLint 설정 추가"',
          priority: 'medium',
        });
      }

      if (!scripts.test) {
        suggestions.push({
          icon: '🧪', title: 'test 스크립트 없음',
          description: '테스트 러너 설정이 없어요.',
          command: 'cs generate "Jest 또는 Vitest 테스트 설정"',
          priority: 'medium',
        });
      }
    } catch { /* skip */ }
  }

  // Check for large files
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
              priority: 'low',
            });
          }
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }
  scanLargeFiles(join(root, 'src'));

  // Check for TODO/FIXME
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
  scanTodos(join(root, 'src'));
  if (todoCount > 5) {
    suggestions.push({
      icon: '📝', title: `TODO/FIXME ${todoCount}개`,
      description: '미완성 코드가 많아요. 하나씩 해결해보세요.',
      command: 'cs verify ./src',
      priority: 'medium',
    });
  }

  // Always suggest playground
  suggestions.push({
    icon: '🎮', title: '프로젝트 벤치마크',
    description: '코드 품질 점수를 측정해보세요.',
    command: 'cs playground',
    priority: 'low',
  });

  return suggestions.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
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

  for (const [i, s] of suggestions.entries()) {
    console.log(`  ${i + 1}. ${s.icon} ${s.title} ${priorityIcons[s.priority]}`);
    console.log(`     ${s.description}`);
    console.log(`     → ${s.command}\n`);
  }
}

// IDENTITY_SEAL: PART-2 | role=suggest-runner | inputs=none | outputs=console
