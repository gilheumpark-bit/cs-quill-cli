// ============================================================
// CS Quill 🦔 — Suppression System
// ============================================================
// 개발자가 합법적으로 findings를 억제하는 메커니즘.
// 엔진을 완벽하게 만들려는 집착 대신 탈출구를 제공.
//
// 지원 문법:
//   // csquill-disable-next-line <ruleId>
//   // csquill-disable-file <ruleId>
//   .csquillignore (glob 패턴)

import { readFileSync, existsSync } from 'fs';
import { join, relative } from 'path';

// ============================================================
// PART 1 — Inline Suppression Parser
// ============================================================

export interface Suppression {
  type: 'next-line' | 'file';
  ruleId: string;
  line: number;
}

/**
 * 코드에서 csquill-disable 주석을 파싱.
 */
export function parseSuppressions(code: string): Suppression[] {
  const suppressions: Suppression[] = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // csquill-disable-next-line <ruleId>
    const nextLineMatch = line.match(/\/\/\s*csquill-disable-next-line\s+(\S+)/);
    if (nextLineMatch) {
      suppressions.push({ type: 'next-line', ruleId: nextLineMatch[1], line: i + 2 }); // 다음 줄
    }

    // csquill-disable-file <ruleId>
    const fileMatch = line.match(/\/\/\s*csquill-disable-file\s+(\S+)/);
    if (fileMatch) {
      suppressions.push({ type: 'file', ruleId: fileMatch[1], line: 0 }); // 전체 파일
    }
  }

  return suppressions;
}

// ============================================================
// PART 2 — .csquillignore Parser
// ============================================================

/**
 * .csquillignore 파일에서 glob 패턴 읽기.
 */
export function loadIgnorePatterns(root: string): string[] {
  const p = join(root, '.csquillignore');
  if (!existsSync(p)) return [];
  try {
    return readFileSync(p, 'utf-8')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));
  } catch {
    return [];
  }
}

/**
 * 파일 경로가 ignore 패턴에 매칭되는지 확인.
 * 간단한 glob: *.min.js, dist/**, src/vendor/*
 */
export function isIgnored(filePath: string, patterns: string[]): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  for (const pattern of patterns) {
    // ** → 모든 하위
    if (pattern.endsWith('/**') || pattern.endsWith('/*')) {
      const prefix = pattern.replace(/\/\*\*?$/, '');
      if (normalized.startsWith(prefix + '/') || normalized === prefix) return true;
    }
    // *.ext 패턴
    if (pattern.startsWith('*.')) {
      if (normalized.endsWith(pattern.slice(1))) return true;
    }
    // 정확한 파일명
    if (normalized === pattern || normalized.endsWith('/' + pattern)) return true;
  }
  return false;
}

// ============================================================
// PART 3 — Finding 필터
// ============================================================

/**
 * findings에서 suppressed 항목 제거.
 */
export function applySuppression(
  findings: Array<{ ruleId?: string; line: number; message: string; [key: string]: unknown }>,
  suppressions: Suppression[],
): { kept: typeof findings; suppressed: number } {
  const fileRules = new Set(
    suppressions.filter(s => s.type === 'file').map(s => s.ruleId),
  );
  const nextLineMap = new Map(
    suppressions.filter(s => s.type === 'next-line').map(s => [`${s.line}:${s.ruleId}`, true]),
  );

  const kept: typeof findings = [];
  let suppressed = 0;

  for (const f of findings) {
    const ruleId = f.ruleId ?? '';

    // 파일 전체 억제
    if (fileRules.has(ruleId) || fileRules.has('*')) {
      suppressed++;
      continue;
    }

    // 다음 줄 억제
    if (nextLineMap.has(`${f.line}:${ruleId}`) || nextLineMap.has(`${f.line}:*`)) {
      suppressed++;
      continue;
    }

    kept.push(f);
  }

  return { kept, suppressed };
}

// IDENTITY_SEAL: PART-3 | role=suppression-filter | inputs=findings,suppressions | outputs=kept,suppressed
