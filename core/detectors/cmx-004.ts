import { RuleDetector } from '../detector-registry';

/**
 * CMX-004: 파일 1000줄 초과
 * Detects source files exceeding 1000 lines.
 */
export const cmx004Detector: RuleDetector = {
  ruleId: 'CMX-004',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const MAX_LINES = 1000;

    const lineCount = sourceFile.getEndLineNumber();
    if (lineCount > MAX_LINES) {
      findings.push({
        line: 1,
        message: `파일이 ${lineCount}줄로 ${MAX_LINES}줄 제한을 초과합니다.`,
      });
    }

    return findings;
  },
};
