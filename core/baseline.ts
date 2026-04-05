// ============================================================
// CS Quill 🦔 — Baseline Manager
// ============================================================
// 최초 스캔 결과를 .csquill-baseline.json에 동결.
// 이후 스캔에서 baseline과 일치하는 findings는 숨김.
// "기존 기술부채를 당장 싸우지 않는다"

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

// ============================================================
// PART 1 — Types
// ============================================================

export interface BaselineEntry {
  ruleId: string;
  file: string;
  line: number;
  snippetHash: string; // 주변 코드 해시 (라인 이동에도 매칭)
  message: string;
  frozenAt: string;
}

export interface BaselineData {
  version: 1;
  createdAt: string;
  updatedAt: string;
  entries: BaselineEntry[];
}

const BASELINE_FILE = '.csquill-baseline.json';

// ============================================================
// PART 2 — Snippet Hash
// ============================================================

/**
 * finding 주변 ±2줄의 코드를 해시.
 * 라인 번호가 바뀌어도 코드가 같으면 매칭됨.
 */
export function computeSnippetHash(code: string, line: number): string {
  const lines = code.split('\n');
  const start = Math.max(0, line - 3);
  const end = Math.min(lines.length, line + 2);
  const snippet = lines.slice(start, end).join('\n').trim();
  return createHash('sha256').update(snippet).digest('hex').slice(0, 16);
}

// ============================================================
// PART 3 — Load / Save
// ============================================================

export function loadBaseline(root: string): BaselineData | null {
  const p = join(root, BASELINE_FILE);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}

export function saveBaseline(root: string, data: BaselineData): void {
  const p = join(root, BASELINE_FILE);
  writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
}

// ============================================================
// PART 4 — Init Baseline (전체 스캔 결과를 동결)
// ============================================================

export function initBaseline(
  root: string,
  findings: Array<{ ruleId?: string; file: string; line: number; message: string }>,
  codeMap: Map<string, string>, // file → code content
): BaselineData {
  const entries: BaselineEntry[] = findings.map(f => ({
    ruleId: f.ruleId ?? 'unknown',
    file: f.file,
    line: f.line,
    snippetHash: codeMap.has(f.file) ? computeSnippetHash(codeMap.get(f.file)!, f.line) : '',
    message: f.message,
    frozenAt: new Date().toISOString(),
  }));

  const data: BaselineData = {
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    entries,
  };

  saveBaseline(root, data);
  return data;
}

// ============================================================
// PART 5 — Filter (baseline 매칭 findings 제거)
// ============================================================

export function filterByBaseline(
  baseline: BaselineData,
  findings: Array<{ ruleId?: string; file: string; line: number; message: string }>,
  codeMap: Map<string, string>,
): { kept: typeof findings; suppressed: number } {
  const baselineSet = new Set(
    baseline.entries.map(e => `${e.file}:${e.snippetHash}:${e.ruleId}`),
  );

  const kept: typeof findings = [];
  let suppressed = 0;

  for (const f of findings) {
    const hash = codeMap.has(f.file) ? computeSnippetHash(codeMap.get(f.file)!, f.line) : '';
    const key = `${f.file}:${hash}:${f.ruleId ?? 'unknown'}`;

    if (baselineSet.has(key)) {
      suppressed++;
    } else {
      kept.push(f);
    }
  }

  return { kept, suppressed };
}

// IDENTITY_SEAL: PART-5 | role=baseline-filter | inputs=baseline,findings | outputs=kept,suppressed
