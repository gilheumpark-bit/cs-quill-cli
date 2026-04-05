// ============================================================
// CS Quill 🦔 — Diff Preview
// ============================================================
// 자동수정 전 변경 내용 컬러 diff로 표시.

// ============================================================
// PART 1 — Simple Diff
// ============================================================

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber: number;
}

export function computeDiff(original: string, modified: string): DiffLine[] {
  const origLines = original.split('\n');
  const modLines = modified.split('\n');
  const result: DiffLine[] = [];

  const maxLen = Math.max(origLines.length, modLines.length);

  for (let i = 0; i < maxLen; i++) {
    const orig = origLines[i];
    const mod = modLines[i];

    if (orig === undefined && mod !== undefined) {
      result.push({ type: 'added', content: mod, lineNumber: i + 1 });
    } else if (mod === undefined && orig !== undefined) {
      result.push({ type: 'removed', content: orig, lineNumber: i + 1 });
    } else if (orig !== mod) {
      result.push({ type: 'removed', content: orig!, lineNumber: i + 1 });
      result.push({ type: 'added', content: mod!, lineNumber: i + 1 });
    } else {
      result.push({ type: 'unchanged', content: orig!, lineNumber: i + 1 });
    }
  }

  return result;
}

// IDENTITY_SEAL: PART-1 | role=diff-compute | inputs=original,modified | outputs=DiffLine[]

// ============================================================
// PART 2 — Color Formatter
// ============================================================

// ANSI color codes (no chalk dependency for lightweight)
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

export function formatDiff(diff: DiffLine[], contextLines: number = 3): string {
  const lines: string[] = [];

  // Only show changed lines with context
  const changedIndices = new Set<number>();
  diff.forEach((d, i) => {
    if (d.type !== 'unchanged') {
      for (let j = Math.max(0, i - contextLines); j <= Math.min(diff.length - 1, i + contextLines); j++) {
        changedIndices.add(j);
      }
    }
  });

  let lastShown = -1;
  for (const idx of [...changedIndices].sort((a, b) => a - b)) {
    if (lastShown >= 0 && idx - lastShown > 1) {
      lines.push(`${DIM}  ...${RESET}`);
    }

    const d = diff[idx];
    const lineNum = d.lineNumber.toString().padStart(4);

    switch (d.type) {
      case 'added':
        lines.push(`${GREEN}+ ${lineNum} │ ${d.content}${RESET}`);
        break;
      case 'removed':
        lines.push(`${RED}- ${lineNum} │ ${d.content}${RESET}`);
        break;
      case 'unchanged':
        lines.push(`${DIM}  ${lineNum} │ ${d.content}${RESET}`);
        break;
    }

    lastShown = idx;
  }

  return lines.join('\n');
}

export function printDiffSummary(diff: DiffLine[]): string {
  const added = diff.filter(d => d.type === 'added').length;
  const removed = diff.filter(d => d.type === 'removed').length;
  return `${GREEN}+${added}${RESET} ${RED}-${removed}${RESET}`;
}

// IDENTITY_SEAL: PART-2 | role=diff-formatter | inputs=DiffLine[] | outputs=string
