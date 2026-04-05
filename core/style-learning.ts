// ============================================================
// CS Quill 🦔 — Style Learning
// ============================================================
// 프로젝트 컨벤션 학습. 수락률 기반 적응.
// Ghost (code-studio/ai/ghost.ts)의 스타일 프로필 개념 차용.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, extname } from 'path';
import { getGlobalConfigDir } from './config';

// ============================================================
// PART 1 — Types
// ============================================================

export interface StyleProfile {
  projectId: string;
  updatedAt: number;
  naming: {
    camelCase: number;
    pascalCase: number;
    snakeCase: number;
    kebabCase: number;
    preferred: string;
  };
  formatting: {
    useSemicolons: boolean;
    singleQuotes: boolean;
    avgLineLength: number;
    tabWidth: number;
  };
  patterns: {
    usesTypeScript: boolean;
    usesArrowFunctions: boolean;
    preferConst: boolean;
    usesAsyncAwait: boolean;
    usesJSX: boolean;
  };
  imports: {
    usesPathAlias: boolean;
    aliasPrefix: string;
    groupOrder: string[];
  };
  aggressiveness: number;
  totalSuggestions: number;
  acceptedSuggestions: number;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=StyleProfile

// ============================================================
// PART 2 — Profile Scanner
// ============================================================

const IGNORE_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', '.cs']);

export function scanProjectStyle(rootPath: string): StyleProfile {
  let camelCount = 0, pascalCount = 0, snakeCount = 0, kebabCount = 0;
  let semiCount = 0, noSemiCount = 0;
  let singleQuoteCount = 0, doubleQuoteCount = 0;
  let totalLineLength = 0, lineCount = 0;
  let arrowCount = 0, functionCount = 0;
  let constCount = 0, letCount = 0;
  let asyncCount = 0;
  let jsxCount = 0;
  let tsFileCount = 0, jsFileCount = 0;
  let pathAliasCount = 0;
  let tabWidth = 2;

  function scan(dir: string): void {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || IGNORE_DIRS.has(entry.name)) continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) { scan(full); continue; }
        if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) continue;

        const ext = extname(entry.name);
        if (ext === '.ts' || ext === '.tsx') tsFileCount++;
        else jsFileCount++;
        if (ext === '.tsx' || ext === '.jsx') jsxCount++;

        try {
          const content = readFileSync(full, 'utf-8');
          const lines = content.split('\n');

          for (const line of lines) {
            totalLineLength += line.length;
            lineCount++;

            if (line.endsWith(';')) semiCount++;
            else if (line.trim().length > 0 && !line.trim().startsWith('//') && !line.trim().startsWith('*')) noSemiCount++;

            if (line.includes("'")) singleQuoteCount++;
            if (line.includes('"')) doubleQuoteCount++;
          }

          // Naming patterns
          const camelMatches = content.match(/\b[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*\b/g);
          const pascalMatches = content.match(/\b[A-Z][a-z][a-zA-Z0-9]*\b/g);
          const snakeMatches = content.match(/\b[a-z]+_[a-z]+\b/g);
          camelCount += camelMatches?.length ?? 0;
          pascalCount += pascalMatches?.length ?? 0;
          snakeCount += snakeMatches?.length ?? 0;

          // Patterns
          arrowCount += (content.match(/=>/g) ?? []).length;
          functionCount += (content.match(/\bfunction\b/g) ?? []).length;
          constCount += (content.match(/\bconst\b/g) ?? []).length;
          letCount += (content.match(/\blet\b/g) ?? []).length;
          asyncCount += (content.match(/\basync\b/g) ?? []).length;
          pathAliasCount += (content.match(/@\//g) ?? []).length;

          // Tab width detection
          const indentMatch = lines.find(l => /^ {2,}[^ ]/.test(l));
          if (indentMatch) {
            const spaces = indentMatch.match(/^ +/)![0].length;
            if (spaces === 4) tabWidth = 4;
          }
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }

  scan(join(rootPath, 'src'));

  const namingMax = Math.max(camelCount, pascalCount, snakeCount, kebabCount);
  const preferred = namingMax === camelCount ? 'camelCase' : namingMax === pascalCount ? 'PascalCase' : namingMax === snakeCount ? 'snake_case' : 'kebab-case';

  return {
    projectId: rootPath.split('/').pop() ?? 'unknown',
    updatedAt: Date.now(),
    naming: { camelCase: camelCount, pascalCase: pascalCount, snakeCase: snakeCount, kebabCase: kebabCount, preferred },
    formatting: {
      useSemicolons: semiCount > noSemiCount,
      singleQuotes: singleQuoteCount > doubleQuoteCount,
      avgLineLength: lineCount > 0 ? Math.round(totalLineLength / lineCount) : 40,
      tabWidth,
    },
    patterns: {
      usesTypeScript: tsFileCount > jsFileCount,
      usesArrowFunctions: arrowCount > functionCount,
      preferConst: constCount > letCount * 2,
      usesAsyncAwait: asyncCount > 5,
      usesJSX: jsxCount > 0,
    },
    imports: {
      usesPathAlias: pathAliasCount > 3,
      aliasPrefix: pathAliasCount > 3 ? '@/' : './',
      groupOrder: ['react', 'libraries', 'local', 'types', 'styles'],
    },
    aggressiveness: 0.5,
    totalSuggestions: 0,
    acceptedSuggestions: 0,
  };
}

// IDENTITY_SEAL: PART-2 | role=scanner | inputs=rootPath | outputs=StyleProfile

// ============================================================
// PART 3 — Persistence + Adaptive Aggressiveness
// ============================================================

function getProfilePath(projectId: string): string {
  return join(getGlobalConfigDir(), 'styles', `${projectId}.json`);
}

export function saveProfile(profile: StyleProfile): void {
  const dir = join(getGlobalConfigDir(), 'styles');
  mkdirSync(dir, { recursive: true });
  writeFileSync(getProfilePath(profile.projectId), JSON.stringify(profile, null, 2));
}

export function loadProfile(projectId: string): StyleProfile | null {
  const path = getProfilePath(projectId);
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, 'utf-8')); } catch { return null; }
}

export function recordSuggestionResult(projectId: string, accepted: boolean): void {
  const profile = loadProfile(projectId);
  if (!profile) return;

  profile.totalSuggestions++;
  if (accepted) profile.acceptedSuggestions++;

  // Adaptive aggressiveness (ghost.ts EMA pattern)
  const acceptRate = profile.totalSuggestions > 0 ? profile.acceptedSuggestions / profile.totalSuggestions : 0.5;
  if (acceptRate > 0.7) {
    profile.aggressiveness = Math.min(1, profile.aggressiveness + 0.05);
  } else if (acceptRate < 0.3) {
    profile.aggressiveness = Math.max(0.1, profile.aggressiveness - 0.05);
  }

  profile.updatedAt = Date.now();
  saveProfile(profile);
}

export function buildStyleDirective(profile: StyleProfile): string {
  const rules: string[] = [];

  rules.push(`Naming: ${profile.naming.preferred}`);
  rules.push(`Semicolons: ${profile.formatting.useSemicolons ? 'always' : 'never'}`);
  rules.push(`Quotes: ${profile.formatting.singleQuotes ? 'single' : 'double'}`);
  rules.push(`Indent: ${profile.formatting.tabWidth} spaces`);

  if (profile.patterns.usesArrowFunctions) rules.push('Prefer arrow functions');
  if (profile.patterns.preferConst) rules.push('Prefer const over let');
  if (profile.imports.usesPathAlias) rules.push(`Import alias: ${profile.imports.aliasPrefix}`);

  return `[Project Style]\n${rules.join('\n')}`;
}

// IDENTITY_SEAL: PART-3 | role=persistence | inputs=StyleProfile | outputs=void
