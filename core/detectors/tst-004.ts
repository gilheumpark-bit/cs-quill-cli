import { RuleDetector } from '../detector-registry';
import type { SourceFile } from 'ts-morph';

/**
 * TST-004: assertion 없이 resolves/rejects
 * expect(...).resolves 또는 expect(...).rejects 를 사용하면서
 * 그 뒤에 toBe/toEqual/toThrow 등 matcher가 없으면 보고.
 */
export const tst004Detector: RuleDetector = {
  ruleId: 'TST-004',
  detect(sourceFile: SourceFile) {
    const findings: Array<{ line: number; message: string }> = [];
    const lines = sourceFile.getFullText().split('\n');

    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (/^\s*\/\//.test(trimmed)) return;
      // expect(...).resolves; or .rejects; without .toXxx on same line
      if (/\.\s*(resolves|rejects)\s*;/.test(line)) {
        findings.push({
          line: i + 1,
          message: 'expect().resolves/rejects 뒤에 matcher 없음 — assertion 누락',
        });
        return;
      }
      // Line ends with .resolves or .rejects (no matcher chained)
      if (/\.\s*(resolves|rejects)\s*$/.test(trimmed) && !/\.to\w+/.test(trimmed)) {
        findings.push({
          line: i + 1,
          message: 'expect().resolves/rejects 뒤에 matcher 없음 — assertion 누락',
        });
      }
    });
    return findings;
  },
};
