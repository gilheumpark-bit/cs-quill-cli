import { RuleDetector } from '../detector-registry';

/**
 * CMX-006: 생성자 100줄 초과
 * Detects constructors whose body exceeds 100 lines.
 */
export const cmx006Detector: RuleDetector = {
  ruleId: 'CMX-006',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const MAX_LINES = 100;

    for (const cls of sourceFile.getClasses()) {
      for (const ctor of cls.getConstructors()) {
        const body = ctor.getBody();
        if (body) {
          const startLine = body.getStartLineNumber();
          const endLine = body.getEndLineNumber();
          const lineCount = endLine - startLine + 1;
          if (lineCount > MAX_LINES) {
            const className = cls.getName() ?? '(anonymous)';
            findings.push({
              line: ctor.getStartLineNumber(),
              message: `클래스 '${className}'의 생성자가 ${lineCount}줄로 ${MAX_LINES}줄 제한을 초과합니다.`,
            });
          }
        }
      }
    }

    return findings;
  },
};
