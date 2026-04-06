import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * CMX-003: 클래스 500줄 초과
 * Detects classes whose body exceeds 500 lines.
 */
export const cmx003Detector: RuleDetector = {
  ruleId: 'CMX-003',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const MAX_LINES = 500;

    for (const cls of sourceFile.getClasses()) {
      const startLine = cls.getStartLineNumber();
      const endLine = cls.getEndLineNumber();
      const lineCount = endLine - startLine + 1;
      if (lineCount > MAX_LINES) {
        const name = cls.getName() ?? '(anonymous class)';
        findings.push({
          line: startLine,
          message: `클래스 '${name}'이(가) ${lineCount}줄로 ${MAX_LINES}줄 제한을 초과합니다.`,
        });
      }
    }

    return findings;
  },
};
