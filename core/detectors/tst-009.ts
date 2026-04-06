import { RuleDetector } from '../detector-registry';
import type { SourceFile } from 'ts-morph';

/**
 * TST-009: coverage 100% 무의미 assertion
 * expect(true).toBe(true), expect(1).toBe(1) 등 항상 통과하는 assertion.
 */
const trivialPatterns = [
  /expect\s*\(\s*true\s*\)\s*\.\s*toBe\s*\(\s*true\s*\)/,
  /expect\s*\(\s*false\s*\)\s*\.\s*toBe\s*\(\s*false\s*\)/,
  /expect\s*\(\s*1\s*\)\s*\.\s*toBe\s*\(\s*1\s*\)/,
  /expect\s*\(\s*0\s*\)\s*\.\s*toBe\s*\(\s*0\s*\)/,
  /expect\s*\(\s*null\s*\)\s*\.\s*toBe\s*\(\s*null\s*\)/,
  /expect\s*\(\s*undefined\s*\)\s*\.\s*toBe\s*\(\s*undefined\s*\)/,
  /expect\s*\(\s*['"`]['"`]\s*\)\s*\.\s*toBe\s*\(\s*['"`]['"`]\s*\)/,
  /expect\s*\(\s*true\s*\)\s*\.\s*toBeTruthy\s*\(\s*\)/,
  /expect\s*\(\s*false\s*\)\s*\.\s*toBeFalsy\s*\(\s*\)/,
];

export const tst009Detector: RuleDetector = {
  ruleId: 'TST-009',
  detect(sourceFile: SourceFile) {
    const findings: Array<{ line: number; message: string }> = [];
    const lines = sourceFile.getFullText().split('\n');

    lines.forEach((line, i) => {
      if (/^\s*\/\//.test(line)) return;
      for (const p of trivialPatterns) {
        if (p.test(line)) {
          findings.push({
            line: i + 1,
            message: '항상 통과하는 trivial assertion — 무의미 커버리지 의심',
          });
          return;
        }
      }
    });
    return findings;
  },
};
