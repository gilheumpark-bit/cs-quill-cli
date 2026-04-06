import { RuleDetector } from '../detector-registry';
import type { SourceFile } from 'ts-morph';

/**
 * TST-005: hardcoded 날짜 — 미래 실패
 * 테스트 파일에서 구체적 날짜 리터럴(2024-01-15 등)을 사용하면 보고.
 */
export const tst005Detector: RuleDetector = {
  ruleId: 'TST-005',
  detect(sourceFile: SourceFile) {
    const findings: Array<{ line: number; message: string }> = [];
    const isTest = /\.(test|spec)\.(ts|js|tsx|jsx)$/.test(sourceFile.getFilePath());
    if (!isTest) return findings;

    const dateRe = /['"`](20\d{2})[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])['"`]/;
    const newDateRe = /new\s+Date\s*\(\s*['"`](20\d{2})/;
    const lines = sourceFile.getFullText().split('\n');

    lines.forEach((line, i) => {
      if (/^\s*\/\//.test(line)) return;
      if (dateRe.test(line) || newDateRe.test(line)) {
        findings.push({
          line: i + 1,
          message: '하드코딩된 날짜 리터럴 — 시간 경과 시 테스트 실패 가능',
        });
      }
    });
    return findings;
  },
};
