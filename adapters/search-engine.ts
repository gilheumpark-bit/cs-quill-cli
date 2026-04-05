// ============================================================
// CS Quill 🦔 — Search Engine (fzf + ripgrep)
// ============================================================
// 프로젝트 내 파일/코드 초고속 검색.
// fzf = 퍼지 파일 검색, ripgrep = 코드 내용 검색.

import { execSync } from 'child_process';
import { readdirSync, _statSync } from 'fs';
import { join, relative, _extname } from 'path';

// ============================================================
// PART 1 — Ripgrep Integration (코드 내용 검색)
// ============================================================

export interface SearchResult {
  file: string;
  line: number;
  column: number;
  content: string;
  matchLength: number;
}

export function ripgrepSearch(query: string, rootPath: string, opts?: {
  glob?: string;
  maxResults?: number;
  caseSensitive?: boolean;
  regex?: boolean;
}): SearchResult[] {
  const maxResults = opts?.maxResults ?? 50;
  const caseFlag = opts?.caseSensitive ? '' : '-i';
  const globFlag = opts?.glob ? `--glob "${opts.glob}"` : '--glob "*.{ts,tsx,js,jsx,py,go,rs,java,rb,php}"';
  const regexFlag = opts?.regex ? '' : '--fixed-strings';

  try {
    const output = execSync(
      `rg ${caseFlag} ${regexFlag} ${globFlag} --json --max-count ${maxResults} -- "${query.replace(/["\\`$]/g, '\\$&')}" "${rootPath}" 2>/dev/null`,
      { encoding: 'utf-8', timeout: 10000, maxBuffer: 5 * 1024 * 1024 },
    );

    const results: SearchResult[] = [];
    for (const line of output.split('\n').filter(Boolean)) {
      try {
        const data = JSON.parse(line);
        if (data.type === 'match') {
          results.push({
            file: relative(rootPath, data.data.path.text),
            line: data.data.line_number,
            column: data.data.submatches?.[0]?.start ?? 0,
            content: data.data.lines?.text?.trim()?.slice(0, 200) ?? '',
            matchLength: data.data.submatches?.[0]?.end - data.data.submatches?.[0]?.start ?? 0,
          });
        }
      } catch { /* skip malformed */ }
    }

    return results;
  } catch {
    // Fallback: native grep
    return grepFallback(query, rootPath, maxResults);
  }
}

function grepFallback(query: string, rootPath: string, maxResults: number): SearchResult[] {
  try {
    const output = execSync(
      `grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" "${query.replace(/"/g, '\\"')}" "${rootPath}" 2>/dev/null | head -${maxResults}`,
      { encoding: 'utf-8', timeout: 10000 },
    );

    return output.split('\n').filter(Boolean).map(line => {
      const match = line.match(/^(.+?):(\d+):(.*)$/);
      if (!match) return null;
      return {
        file: relative(rootPath, match[1]),
        line: parseInt(match[2], 10),
        column: 0,
        content: match[3].trim().slice(0, 200),
        matchLength: query.length,
      };
    }).filter((r): r is SearchResult => r !== null);
  } catch {
    return [];
  }
}

// IDENTITY_SEAL: PART-1 | role=ripgrep | inputs=query,rootPath | outputs=SearchResult[]

// ============================================================
// PART 2 — Fuzzy File Search (fzf 스타일)
// ============================================================

export interface FuzzyResult {
  file: string;
  score: number;
}

export function fuzzyFileSearch(query: string, rootPath: string, maxResults: number = 20): FuzzyResult[] {
  // Collect all files
  const files: string[] = [];
  const IGNORE = new Set(['node_modules', '.next', '.git', 'dist', 'build', '.cs', '__pycache__', '.cache']);

  function walk(dir: string): void {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name.startsWith('.') || IGNORE.has(e.name)) continue;
        const full = join(dir, e.name);
        if (e.isDirectory()) { walk(full); continue; }
        files.push(relative(rootPath, full));
      }
    } catch { /* skip */ }
  }
  walk(rootPath);

  // Fuzzy match
  const queryLower = query.toLowerCase();
  const results: FuzzyResult[] = [];

  for (const file of files) {
    const score = fuzzyScore(queryLower, file.toLowerCase());
    if (score > 0) {
      results.push({ file, score });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, maxResults);
}

function fuzzyScore(query: string, target: string): number {
  if (query.length === 0) return 0;
  if (target.includes(query)) return 100 + (1 / target.length);

  let score = 0;
  let queryIdx = 0;
  let consecutive = 0;
  let prevMatch = false;

  for (let i = 0; i < target.length && queryIdx < query.length; i++) {
    if (target[i] === query[queryIdx]) {
      queryIdx++;
      consecutive = prevMatch ? consecutive + 1 : 1;
      score += consecutive * 2;

      // Bonus for path separator match (start of filename/directory)
      if (i === 0 || target[i - 1] === '/' || target[i - 1] === '\\' || target[i - 1] === '.') {
        score += 5;
      }
      prevMatch = true;
    } else {
      prevMatch = false;
    }
  }

  return queryIdx === query.length ? score : 0;
}

// IDENTITY_SEAL: PART-2 | role=fuzzy-search | inputs=query,rootPath | outputs=FuzzyResult[]

// ============================================================
// PART 3 — Symbol Search (함수/클래스 검색)
// ============================================================

export interface SymbolResult {
  name: string;
  type: 'function' | 'class' | 'variable' | 'type' | 'interface';
  file: string;
  line: number;
}

export function symbolSearch(query: string, rootPath: string, maxResults: number = 20): SymbolResult[] {
  const patterns = [
    { regex: `(?:export\\s+)?(?:async\\s+)?function\\s+(${query}\\w*)`, type: 'function' as const },
    { regex: `(?:export\\s+)?class\\s+(${query}\\w*)`, type: 'class' as const },
    { regex: `(?:export\\s+)?(?:const|let|var)\\s+(${query}\\w*)\\s*=`, type: 'variable' as const },
    { regex: `(?:export\\s+)?type\\s+(${query}\\w*)\\s*=`, type: 'type' as const },
    { regex: `(?:export\\s+)?interface\\s+(${query}\\w*)`, type: 'interface' as const },
  ];

  const results: SymbolResult[] = [];

  for (const pat of patterns) {
    try {
      const output = execSync(
        `rg --json -e "${pat.regex}" --glob "*.{ts,tsx,js,jsx}" "${rootPath}" 2>/dev/null | head -${maxResults}`,
        { encoding: 'utf-8', timeout: 5000 },
      );

      for (const line of output.split('\n').filter(Boolean)) {
        try {
          const data = JSON.parse(line);
          if (data.type === 'match') {
            const nameMatch = data.data.lines?.text?.match(new RegExp(pat.regex));
            if (nameMatch?.[1]) {
              results.push({
                name: nameMatch[1],
                type: pat.type,
                file: relative(rootPath, data.data.path.text),
                line: data.data.line_number,
              });
            }
          }
        } catch { /* skip */ }
      }
    } catch { /* rg not available */ }
  }

  return results.slice(0, maxResults);
}

// IDENTITY_SEAL: PART-3 | role=symbol-search | inputs=query,rootPath | outputs=SymbolResult[]
