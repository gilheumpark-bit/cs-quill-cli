import { RuleDetector } from '../detector-registry';

/**
 * CMX-013: 줄 120자 초과
 * Detects lines exceeding 120 characters.
 */
export const cmx013Detector: RuleDetector = {
  ruleId: 'CMX-013',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const MAX_LENGTH = 120;

    const lines = sourceFile.getFullText().split('\n');
    for (let i = 0; i < lines.length; i++) {
      const len = lines[i].replace(/\r$/, '').length;
      if (len > MAX_LENGTH) {
        findings.push({
          line: i + 1,
          message: `줄 길이가 ${len}자로 ${MAX_LENGTH}자 제한을 초과합니다.`,
        });
      }
    }

    return findings;
  },
};
