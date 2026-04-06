import { RuleDetector } from '../detector-registry';
import { isParseIntCall } from './rte-helpers';

/** parseInt 인자 1개 — radix 누락(8진수 혼동 등) 및 NaN 가능 */
export const rte009Detector: RuleDetector = {
  ruleId: 'RTE-009',
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];
    sourceFile.forEachDescendant((node) => {
      if (!isParseIntCall(node)) return;
      const args = node.getArguments();
      if (args.length >= 2) return;
      findings.push({
        line: node.getStartLineNumber(),
        message: 'parseInt — 두 번째 인자(radix)와 Number.isNaN 결과 검사 권장',
      });
    });
    return findings;
  },
};
