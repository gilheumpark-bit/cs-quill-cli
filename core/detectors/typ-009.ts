import { RuleDetector } from '../detector-registry';

/**
 * 오버로드 선언과 구현의 파라미터 개수 불일치 (휴리스틱)
 * Phase / Rule Category: type
 */
export const typ009Detector: RuleDetector = {
  ruleId: 'TYP-009', // 함수 오버로드 시그니처 불일치
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];

    for (const fn of sourceFile.getFunctions()) {
      const overloads = fn.getOverloads();
      if (overloads.length < 2) continue;
      const impl = fn.getImplementation();
      if (!impl) continue;
      const implCount = impl.getParameters().length;
      for (const ov of overloads) {
        if (ov === impl) continue;
        if (ov.getParameters().length !== implCount) {
          findings.push({
            line: impl.getStartLineNumber(),
            message: '함수 오버로드와 구현의 파라미터 개수 불일치',
          });
          break;
        }
      }
    }

    return findings;
  },
};
