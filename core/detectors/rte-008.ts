import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';
import { isInTryBlockOnly, isJsonParseCall } from './rte-helpers';

export const rte008Detector: RuleDetector = {
  ruleId: 'RTE-008',
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];
    sourceFile.forEachDescendant((node) => {
      if (!isJsonParseCall(node)) return;
      if (isInTryBlockOnly(node)) return;
      findings.push({
        line: node.getStartLineNumber(),
        message: 'JSON.parse — try/catch로 감싸 예외 처리 권장',
      });
    });
    return findings;
  },
};
