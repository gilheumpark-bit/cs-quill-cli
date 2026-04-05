// ============================================================
// CS Quill 🦔 — cs preset command
// ============================================================
// 커뮤니티 프리셋 관리. 최신 프레임워크 규칙 공유.
// 로컬 프리셋 디렉토리: ~/.cs/presets/

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { getGlobalConfigDir } from '../core/config';

// ============================================================
// PART 1 — Types
// ============================================================

export interface Preset {
  name: string;
  version: string;
  framework: string;
  frameworkVersion: string;
  rules: {
    patterns: string[];
    antiPatterns: string[];
    deprecated: string[];
    conventions: string[];
  };
  createdAt: number;
  author?: string;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=Preset

// ============================================================
// PART 2 — Built-in Presets
// ============================================================

const BUILTIN_PRESETS: Preset[] = [
  {
    name: 'react-19', version: '1.0.0', framework: 'React', frameworkVersion: '19.x', createdAt: Date.now(),
    rules: {
      patterns: ['Server Components by default', 'use client directive for client-only', 'use() hook for promises', 'ref as prop (no forwardRef)'],
      antiPatterns: ['forwardRef (removed in 19)', 'getServerSideProps (Next.js pages router)', 'class components'],
      deprecated: ['React.FC (unnecessary)', 'defaultProps on function components', 'propTypes'],
      conventions: ['Prefer server components', 'Collocate loading.tsx/error.tsx', 'Use Suspense boundaries'],
    },
  },
  {
    name: 'next-16', version: '1.0.0', framework: 'Next.js', frameworkVersion: '16.x', createdAt: Date.now(),
    rules: {
      patterns: ['App Router only', 'Server Actions for mutations', 'Metadata API for SEO', 'Route Handlers for API'],
      antiPatterns: ['pages/ directory', 'getServerSideProps', 'getStaticProps', 'next/router (use next/navigation)'],
      deprecated: ['next/head (use Metadata)', 'next/image legacy loader', '_app.tsx/_document.tsx'],
      conventions: ['app/ directory structure', 'layout.tsx for shared UI', 'loading.tsx for Suspense', 'error.tsx for boundaries'],
    },
  },
  {
    name: 'tailwind-4', version: '1.0.0', framework: 'Tailwind CSS', frameworkVersion: '4.x', createdAt: Date.now(),
    rules: {
      patterns: ['CSS-first configuration', '@theme directive', 'Container queries native', 'Composable variants'],
      antiPatterns: ['tailwind.config.js (use CSS)', '@apply in components (prefer inline)', 'JIT purge config'],
      deprecated: ['tailwind.config.js', 'purge option', '@variants directive'],
      conventions: ['Semantic token classes', '4px grid spacing', 'Mobile-first breakpoints'],
    },
  },
  {
    name: 'typescript-5', version: '1.0.0', framework: 'TypeScript', frameworkVersion: '5.x', createdAt: Date.now(),
    rules: {
      patterns: ['satisfies operator', 'const type parameters', 'Decorator metadata', 'Module resolution bundler'],
      antiPatterns: ['enum (prefer const object)', 'namespace', 'any type (use unknown)', 'non-null assertion !'],
      deprecated: ['DefinitelyTyped for built-in types', 'paths without baseUrl'],
      conventions: ['strict: true always', 'Prefer interfaces for objects', 'Use type for unions/intersections'],
    },
  },
];

// IDENTITY_SEAL: PART-2 | role=builtins | inputs=none | outputs=BUILTIN_PRESETS

// ============================================================
// PART 3 — Preset Management
// ============================================================

function getPresetDir(): string {
  return join(getGlobalConfigDir(), 'presets');
}

function loadInstalledPresets(): Preset[] {
  const dir = getPresetDir();
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try { return JSON.parse(readFileSync(join(dir, f), 'utf-8')) as Preset; } catch { return null; }
    })
    .filter((p): p is Preset => p !== null);
}

function getAllPresets(): Preset[] {
  return [...BUILTIN_PRESETS, ...loadInstalledPresets()];
}

export function getPresetsForFramework(framework: string): Preset[] {
  return getAllPresets().filter(p => p.framework.toLowerCase().includes(framework.toLowerCase()));
}

export function buildPresetDirective(presets: Preset[]): string {
  if (presets.length === 0) return '';

  const lines: string[] = ['[Framework Presets]'];
  for (const p of presets) {
    lines.push(`\n--- ${p.name} (${p.framework} ${p.frameworkVersion}) ---`);
    if (p.rules.patterns.length > 0) lines.push(`USE: ${p.rules.patterns.join(', ')}`);
    if (p.rules.antiPatterns.length > 0) lines.push(`AVOID: ${p.rules.antiPatterns.join(', ')}`);
    if (p.rules.deprecated.length > 0) lines.push(`DEPRECATED: ${p.rules.deprecated.join(', ')}`);
  }
  return lines.join('\n');
}

// IDENTITY_SEAL: PART-3 | role=management | inputs=framework | outputs=Preset[]

// ============================================================
// PART 4 — Preset Runner
// ============================================================

export async function runPreset(action: string, args?: string[]): Promise<void> {
  switch (action) {
    case 'list': {
      const all = getAllPresets();
      const installed = loadInstalledPresets();
      console.log('🦔 CS Quill — 프리셋\n');
      console.log('  📦 내장:');
      for (const p of BUILTIN_PRESETS) {
        console.log(`     ${p.name} (${p.framework} ${p.frameworkVersion})`);
      }
      if (installed.length > 0) {
        console.log('\n  📥 설치됨:');
        for (const p of installed) {
          console.log(`     ${p.name} (${p.framework} ${p.frameworkVersion})`);
        }
      }
      console.log(`\n  총: ${all.length}개\n`);
      break;
    }

    case 'show': {
      if (!args || args.length < 1) { console.log('  사용법: cs preset show <name>'); return; }
      const preset = getAllPresets().find(p => p.name === args[0]);
      if (!preset) { console.log(`  ⚠️  "${args[0]}" 프리셋 없음`); return; }

      console.log(`\n  📦 ${preset.name} (${preset.framework} ${preset.frameworkVersion})\n`);
      console.log('  ✅ 사용:');
      for (const p of preset.rules.patterns) console.log(`     - ${p}`);
      console.log('\n  ❌ 금지:');
      for (const p of preset.rules.antiPatterns) console.log(`     - ${p}`);
      console.log('\n  ⚠️  Deprecated:');
      for (const p of preset.rules.deprecated) console.log(`     - ${p}`);
      console.log('');
      break;
    }

    case 'install': {
      if (!args || args.length < 1) { console.log('  사용법: cs preset install <name>'); return; }
      // MVP: copy builtin to installed for demo
      const builtin = BUILTIN_PRESETS.find(p => p.name === args[0]);
      if (!builtin) { console.log(`  ⚠️  "${args[0]}" 프리셋 없음`); return; }
      const dir = getPresetDir();
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `${args[0]}.json`), JSON.stringify(builtin, null, 2));
      console.log(`  ✅ ${args[0]} 설치됨\n`);
      break;
    }

    case 'remove': {
      if (!args || args.length < 1) { console.log('  사용법: cs preset remove <name>'); return; }
      const path = join(getPresetDir(), `${args[0]}.json`);
      if (!existsSync(path)) { console.log(`  ⚠️  "${args[0]}" 설치되지 않음`); return; }
      unlinkSync(path);
      console.log(`  🗑️  ${args[0]} 제��됨\n`);
      break;
    }

    default:
      console.log('  사용법: cs preset <list|show|install|remove>');
  }
}

// IDENTITY_SEAL: PART-4 | role=runner | inputs=action,args | outputs=console
