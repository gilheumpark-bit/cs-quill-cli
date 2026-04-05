// @ts-nocheck — external library wrapper, types handled at runtime
// ============================================================
// CS Quill 🦔 — Git Enhanced (Merge Conflict + Rebase Helper)
// ============================================================
// 충돌 감지/해소 + AI 커밋 메시지 + 브랜치 전략.

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// ============================================================
// PART 1 — Merge Conflict Detector
// ============================================================

export interface ConflictInfo {
  file: string;
  conflicts: Array<{
    startLine: number;
    ours: string;
    theirs: string;
    endLine: number;
  }>;
}

export function detectConflicts(rootPath: string): ConflictInfo[] {
  const results: ConflictInfo[] = [];

  try {
    const output = execSync('git diff --name-only --diff-filter=U 2>/dev/null', {
      cwd: rootPath, encoding: 'utf-8', stdio: 'pipe',
    });

    for (const file of output.split('\n').filter(Boolean)) {
      const fullPath = join(rootPath, file);
      if (!existsSync(fullPath)) continue;

      const content = readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      const conflicts: ConflictInfo['conflicts'] = [];

      let phase: 'none' | 'ours' | 'theirs' = 'none';
      let startLine = 0;
      let oursLines: string[] = [];
      let theirsLines: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith('<<<<<<<')) {
          phase = 'ours';
          startLine = i + 1;
          oursLines = [];
          theirsLines = [];
        } else if (line.startsWith('=======') && phase === 'ours') {
          phase = 'theirs';
        } else if (line.startsWith('>>>>>>>') && phase === 'theirs') {
          conflicts.push({
            startLine,
            ours: oursLines.join('\n'),
            theirs: theirsLines.join('\n'),
            endLine: i + 1,
          });
          phase = 'none';
        } else if (phase === 'ours') {
          oursLines.push(line);
        } else if (phase === 'theirs') {
          theirsLines.push(line);
        }
      }

      if (conflicts.length > 0) {
        results.push({ file, conflicts });
      }
    }
  } catch { /* not in merge state */ }

  return results;
}

// IDENTITY_SEAL: PART-1 | role=conflict-detect | inputs=rootPath | outputs=ConflictInfo[]

// ============================================================
// PART 2 — Conflict Resolver (AI + Rule-Based)
// ============================================================

export interface ResolveStrategy {
  type: 'ours' | 'theirs' | 'both' | 'ai';
}

export function resolveConflictRule(
  conflict: ConflictInfo['conflicts'][0],
  strategy: ResolveStrategy['type'],
): string {
  switch (strategy) {
    case 'ours': return conflict.ours;
    case 'theirs': return conflict.theirs;
    case 'both': return `${conflict.ours}\n${conflict.theirs}`;
    default: return conflict.ours; // fallback
  }
}

export async function resolveConflictWithAI(
  conflict: ConflictInfo['conflicts'][0],
  context: string,
): Promise<string> {
  try {
    // CLI 환경에서 AI provider 동적 로드
    let resolved = '';

    // ai-config에서 설정된 provider 사용
    const { getAIConfig } = require('../core/ai-bridge');
    const aiConfig = getAIConfig();

    if (aiConfig.provider === 'groq' || !aiConfig.apiKey) {
      // AI 없으면 rule-based: import 정렬 → 둘 다 포함, 나머지 → ours
      const oursImports = conflict.ours.match(/^import\s/gm);
      const theirsImports = conflict.theirs.match(/^import\s/gm);

      if (oursImports && theirsImports) {
        // import 충돌: 둘 다 포함 후 중복 제거
        const allImports = new Set([
          ...conflict.ours.split('\n').filter(l => l.startsWith('import')),
          ...conflict.theirs.split('\n').filter(l => l.startsWith('import')),
        ]);
        return [...allImports].sort().join('\n');
      }

      return conflict.ours;
    }

    // AI 호출 (fetch 기반, shell injection 방지)
    const baseUrl = aiConfig.baseUrl ?? 'https://api.groq.com/openai/v1';
    const body = JSON.stringify({
      model: aiConfig.model ?? 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'Merge conflict resolver. Output ONLY resolved code. No explanation.' },
        { role: 'user', content: `Ours:\n${conflict.ours}\n\nTheirs:\n${conflict.theirs}` },
      ],
      max_tokens: 2000,
    });

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiConfig.apiKey}`,
      },
      body,
      signal: AbortSignal.timeout(15000),
    });

    const data = await response.json();
    resolved = data.choices?.[0]?.message?.content ?? '';
    return resolved.replace(/^```\w*\n?/gm, '').replace(/```$/gm, '').trim() || conflict.ours;
  } catch {
    return conflict.ours;
  }
}

// Apply resolved conflicts to file
export function applyConflictResolutions(
  rootPath: string,
  file: string,
  resolutions: Map<number, string>, // startLine → resolved code
): boolean {
  const fullPath = join(rootPath, file);
  if (!existsSync(fullPath)) return false;

  const content = readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');
  const result: string[] = [];

  let skip = false;
  let currentStart = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('<<<<<<<')) {
      currentStart = i + 1;
      skip = true;
      const resolved = resolutions.get(currentStart);
      if (resolved !== undefined) {
        result.push(resolved);
      }
    } else if (lines[i].startsWith('>>>>>>>') && skip) {
      skip = false;
    } else if (!skip) {
      result.push(lines[i]);
    }
  }

  writeFileSync(fullPath, result.join('\n'), 'utf-8');
  return true;
}

// IDENTITY_SEAL: PART-2 | role=resolver | inputs=conflict,strategy | outputs=string

// ============================================================
// PART 3 — Smart Commit Message
// ============================================================

export function generateCommitMessage(rootPath: string): string {
  try {
    const stat = execSync('git diff --cached --stat 2>/dev/null', {
      cwd: rootPath, encoding: 'utf-8', stdio: 'pipe',
    });

    if (!stat.trim()) return '';

    const diff = execSync('git diff --cached --no-color 2>/dev/null', {
      cwd: rootPath, encoding: 'utf-8', stdio: 'pipe',
    });

    // Rule-based commit message (AI 없이)
    const files = stat.split('\n').filter(Boolean);
    const fileCount = files.length - 1; // last line is summary

    const additions = diff.match(/^\+[^+]/gm)?.length ?? 0;
    const deletions = diff.match(/^-[^-]/gm)?.length ?? 0;

    // Detect type from changed files
    const allPaths = files.map(f => f.split('|')[0].trim()).filter(Boolean);
    const hasTest = allPaths.some(p => /test|spec|__tests__/i.test(p));
    const hasDocs = allPaths.some(p => /README|CHANGELOG|docs?\//i.test(p));
    const hasFix = diff.includes('fix') || diff.includes('bug');
    const hasConfig = allPaths.some(p => /config|\.json$|\.yml$|\.toml$/i.test(p));

    const type = hasTest ? 'test' : hasDocs ? 'docs' : hasFix ? 'fix' : hasConfig ? 'chore' : additions > deletions ? 'feat' : 'refactor';

    // Scope from directory
    const scopes = allPaths
      .map(p => p.split('/').slice(0, 2).join('/'))
      .filter(Boolean);
    const scope = scopes.length === 1 ? scopes[0].replace(/^src\//, '').split('/')[0] : '';

    const scopeStr = scope ? `(${scope})` : '';
    return `${type}${scopeStr}: update ${fileCount} file${fileCount > 1 ? 's' : ''} (+${additions}/-${deletions})`;
  } catch {
    return 'chore: update files';
  }
}

// IDENTITY_SEAL: PART-3 | role=commit-msg | inputs=rootPath | outputs=string

// ============================================================
// PART 4 — Branch Strategy Helper
// ============================================================

export function suggestBranchName(description: string): string {
  const prefix = /fix|bug/i.test(description) ? 'fix' :
    /feat|add|new/i.test(description) ? 'feat' :
    /refactor|clean/i.test(description) ? 'refactor' :
    /test/i.test(description) ? 'test' :
    /doc/i.test(description) ? 'docs' : 'feat';

  const slug = description
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40);

  return `${prefix}/${slug}`;
}

export function getStaleLocalBranches(rootPath: string, daysSince: number = 30): string[] {
  try {
    const output = execSync(
      'git for-each-ref --sort=committerdate --format="%(refname:short)|%(committerdate:unix)" refs/heads/ 2>/dev/null',
      { cwd: rootPath, encoding: 'utf-8', stdio: 'pipe' },
    );

    const cutoff = Date.now() / 1000 - daysSince * 86400;
    return output.split('\n').filter(Boolean)
      .map(line => {
        const [branch, timestamp] = line.split('|');
        return { branch, timestamp: parseInt(timestamp, 10) };
      })
      .filter(b => b.timestamp < cutoff && b.branch !== 'main' && b.branch !== 'master')
      .map(b => b.branch);
  } catch {
    return [];
  }
}

// IDENTITY_SEAL: PART-4 | role=branch | inputs=description | outputs=branchName

// ============================================================
// PART 5 — Git Stats (리포지토리 건강도)
// ============================================================

export function getRepoHealth(rootPath: string): {
  totalCommits: number;
  contributors: number;
  staleBranches: number;
  uncommittedChanges: number;
  lastCommitAge: string;
} {
  try {
    const totalCommits = parseInt(
      execSync('git rev-list --count HEAD 2>/dev/null', { cwd: rootPath, encoding: 'utf-8', stdio: 'pipe' }).trim(),
      10,
    ) || 0;

    const contributors = parseInt(
      execSync('git shortlog -sn --no-merges 2>/dev/null | wc -l', { cwd: rootPath, encoding: 'utf-8', stdio: 'pipe' }).trim(),
      10,
    ) || 0;

    const staleBranches = getStaleLocalBranches(rootPath).length;

    const statusOutput = execSync('git status --porcelain 2>/dev/null', { cwd: rootPath, encoding: 'utf-8', stdio: 'pipe' });
    const uncommittedChanges = statusOutput.split('\n').filter(Boolean).length;

    const lastCommitDate = execSync('git log -1 --format=%cr 2>/dev/null', { cwd: rootPath, encoding: 'utf-8', stdio: 'pipe' }).trim();

    return { totalCommits, contributors, staleBranches, uncommittedChanges, lastCommitAge: lastCommitDate };
  } catch {
    return { totalCommits: 0, contributors: 0, staleBranches: 0, uncommittedChanges: 0, lastCommitAge: 'unknown' };
  }
}

// IDENTITY_SEAL: PART-5 | role=repo-health | inputs=rootPath | outputs=health
