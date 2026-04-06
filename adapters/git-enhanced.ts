// @ts-nocheck — external library wrapper, types handled at runtime
// ============================================================
// CS Quill 🦔 — Git Enhanced (Merge Conflict + Rebase Helper)
// ============================================================
// 충돌 감지/해소 + AI 커밋 메시지 + 브랜치 전략.

const { execSync } = require('child_process');
const { readFileSync, writeFileSync, existsSync } = require('fs');
const { join } = require('path');

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

// ============================================================
// PART 6 — Commit Frequency Analytics
// ============================================================

export function getCommitFrequency(rootPath: string, days: number = 90): {
  daily: Array<{ date: string; count: number }>;
  weeklyAvg: number;
  busiestDay: string;
  quietestDay: string;
  totalCommits: number;
  activeDays: number;
} {
  try {
    const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    const output = execSync(
      `git log --since="${since}" --format="%ai" --no-merges 2>/dev/null`,
      { cwd: rootPath, encoding: 'utf-8', stdio: 'pipe' },
    );

    const counts = new Map<string, number>();
    for (const line of output.split('\n').filter(Boolean)) {
      const date = line.slice(0, 10);
      counts.set(date, (counts.get(date) ?? 0) + 1);
    }

    const daily = [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));

    const totalCommits = daily.reduce((s, d) => s + d.count, 0);
    const activeDays = daily.length;
    const weeklyAvg = activeDays > 0 ? Math.round((totalCommits / (days / 7)) * 10) / 10 : 0;

    // Day-of-week analysis
    const dowCounts = new Map<string, number>();
    const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (const { date, count } of daily) {
      const dow = dowNames[new Date(date).getDay()];
      dowCounts.set(dow, (dowCounts.get(dow) ?? 0) + count);
    }

    let busiestDay = 'N/A';
    let quietestDay = 'N/A';
    let maxDow = 0;
    let minDow = Infinity;
    for (const [dow, cnt] of dowCounts) {
      if (cnt > maxDow) { maxDow = cnt; busiestDay = dow; }
      if (cnt < minDow) { minDow = cnt; quietestDay = dow; }
    }

    return { daily: daily.slice(-30), weeklyAvg, busiestDay, quietestDay, totalCommits, activeDays };
  } catch {
    return { daily: [], weeklyAvg: 0, busiestDay: 'N/A', quietestDay: 'N/A', totalCommits: 0, activeDays: 0 };
  }
}

// IDENTITY_SEAL: PART-6 | role=commit-frequency | inputs=rootPath | outputs=frequency

// ============================================================
// PART 7 — Hot Files (Most Changed Files)
// ============================================================

export function getHotFiles(rootPath: string, days: number = 60, limit: number = 15): Array<{
  file: string;
  commits: number;
  authors: number;
  lastChanged: string;
  churnScore: number;
}> {
  try {
    const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    const output = execSync(
      `git log --since="${since}" --name-only --pretty=format:"COMMIT_SEP|%an|%ai" --no-merges 2>/dev/null`,
      { cwd: rootPath, encoding: 'utf-8', stdio: 'pipe' },
    );

    const fileStats = new Map<string, { commits: number; authors: Set<string>; lastDate: string }>();
    let currentAuthor = '';
    let currentDate = '';

    for (const line of output.split('\n')) {
      if (line.startsWith('COMMIT_SEP|')) {
        const parts = line.split('|');
        currentAuthor = parts[1] ?? '';
        currentDate = (parts[2] ?? '').slice(0, 10);
      } else if (line.trim() && !line.startsWith('COMMIT_SEP')) {
        const file = line.trim();
        const existing = fileStats.get(file) ?? { commits: 0, authors: new Set<string>(), lastDate: '' };
        existing.commits++;
        if (currentAuthor) existing.authors.add(currentAuthor);
        if (currentDate > existing.lastDate) existing.lastDate = currentDate;
        fileStats.set(file, existing);
      }
    }

    return [...fileStats.entries()]
      .map(([file, stats]) => ({
        file,
        commits: stats.commits,
        authors: stats.authors.size,
        lastChanged: stats.lastDate,
        churnScore: stats.commits * (stats.authors.size > 1 ? 1.5 : 1),
      }))
      .sort((a, b) => b.churnScore - a.churnScore)
      .slice(0, limit);
  } catch {
    return [];
  }
}

// IDENTITY_SEAL: PART-7 | role=hot-files | inputs=rootPath | outputs=hotFiles

// ============================================================
// PART 8 — Contributor Stats
// ============================================================

export function getContributorStats(rootPath: string, days: number = 90): Array<{
  author: string;
  commits: number;
  additions: number;
  deletions: number;
  filesChanged: number;
  firstCommit: string;
  lastCommit: string;
  activeDays: number;
}> {
  try {
    const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    const output = execSync(
      `git log --since="${since}" --pretty=format:"AUTHOR_SEP|%an|%ai" --numstat --no-merges 2>/dev/null`,
      { cwd: rootPath, encoding: 'utf-8', stdio: 'pipe' },
    );

    const stats = new Map<string, {
      commits: number; additions: number; deletions: number;
      filesChanged: Set<string>; dates: Set<string>;
      firstCommit: string; lastCommit: string;
    }>();

    let current = '';
    let currentDate = '';

    for (const line of output.split('\n')) {
      if (line.startsWith('AUTHOR_SEP|')) {
        const parts = line.split('|');
        current = parts[1] ?? '';
        currentDate = (parts[2] ?? '').slice(0, 10);

        if (!stats.has(current)) {
          stats.set(current, {
            commits: 0, additions: 0, deletions: 0,
            filesChanged: new Set(), dates: new Set(),
            firstCommit: currentDate, lastCommit: currentDate,
          });
        }
        const s = stats.get(current)!;
        s.commits++;
        s.dates.add(currentDate);
        if (currentDate < s.firstCommit) s.firstCommit = currentDate;
        if (currentDate > s.lastCommit) s.lastCommit = currentDate;
      } else if (current && line.trim()) {
        const parts = line.split('\t');
        if (parts.length >= 3) {
          const added = parseInt(parts[0], 10) || 0;
          const deleted = parseInt(parts[1], 10) || 0;
          const file = parts[2];
          const s = stats.get(current)!;
          s.additions += added;
          s.deletions += deleted;
          s.filesChanged.add(file);
        }
      }
    }

    return [...stats.entries()]
      .map(([author, s]) => ({
        author,
        commits: s.commits,
        additions: s.additions,
        deletions: s.deletions,
        filesChanged: s.filesChanged.size,
        firstCommit: s.firstCommit,
        lastCommit: s.lastCommit,
        activeDays: s.dates.size,
      }))
      .sort((a, b) => b.commits - a.commits);
  } catch {
    return [];
  }
}

// IDENTITY_SEAL: PART-8 | role=contributor-stats | inputs=rootPath | outputs=contributors

// ============================================================
// PART 9 — Branch Age Warnings
// ============================================================

export function getBranchAgeWarnings(rootPath: string): Array<{
  branch: string;
  ageInDays: number;
  lastCommitDate: string;
  lastAuthor: string;
  aheadBehind: string;
  severity: 'info' | 'warning' | 'error';
}> {
  try {
    const output = execSync(
      'git for-each-ref --sort=-committerdate --format="%(refname:short)|%(committerdate:unix)|%(committerdate:short)|%(authorname)" refs/heads/ 2>/dev/null',
      { cwd: rootPath, encoding: 'utf-8', stdio: 'pipe' },
    );

    const now = Date.now() / 1000;
    const results: Array<{
      branch: string; ageInDays: number; lastCommitDate: string;
      lastAuthor: string; aheadBehind: string; severity: 'info' | 'warning' | 'error';
    }> = [];

    // Find default branch
    let defaultBranch = 'main';
    try {
      defaultBranch = execSync('git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null', {
        cwd: rootPath, encoding: 'utf-8', stdio: 'pipe',
      }).trim().replace('refs/remotes/origin/', '');
    } catch {
      try {
        execSync('git rev-parse --verify main 2>/dev/null', { cwd: rootPath, stdio: 'pipe' });
        defaultBranch = 'main';
      } catch {
        defaultBranch = 'master';
      }
    }

    for (const line of output.split('\n').filter(Boolean)) {
      const [branch, timestamp, dateStr, author] = line.split('|');
      if (branch === defaultBranch) continue;

      const ageInDays = Math.floor((now - parseInt(timestamp, 10)) / 86400);

      // Get ahead/behind count
      let aheadBehind = '';
      try {
        const ab = execSync(
          `git rev-list --left-right --count "${defaultBranch}...${branch}" 2>/dev/null`,
          { cwd: rootPath, encoding: 'utf-8', stdio: 'pipe' },
        ).trim();
        const [behind, ahead] = ab.split('\t').map(Number);
        aheadBehind = `+${ahead ?? 0}/-${behind ?? 0}`;
      } catch { /* skip */ }

      const severity = ageInDays > 90 ? 'error' : ageInDays > 30 ? 'warning' : 'info';

      results.push({
        branch,
        ageInDays,
        lastCommitDate: dateStr,
        lastAuthor: author,
        aheadBehind,
        severity,
      });
    }

    return results.filter(r => r.ageInDays > 14);
  } catch {
    return [];
  }
}

// IDENTITY_SEAL: PART-9 | role=branch-age | inputs=rootPath | outputs=branchWarnings
