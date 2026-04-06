import { RuleDetector } from '../detector-registry';

/**
 * CMX-005: 클래스 메서드 20개 초과
 * Detects classes with more than 20 methods (God class indicator).
 */
export const cmx005Detector: RuleDetector = {
  ruleId: 'CMX-005',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const MAX_METHODS = 20;

    for (const cls of sourceFile.getClasses()) {
      const methodCount = cls.getMethods().length;
      if (methodCount > MAX_METHODS) {
        const name = cls.getName() ?? '(anonymous class)';
        findings.push({
          line: cls.getStartLineNumber(),
          message: `클래스 '${name}'의 메서드가 ${methodCount}개로 ${MAX_METHODS}개 제한을 초과합니다.`,
        });
      }
    }

    return findings;
  },
};
