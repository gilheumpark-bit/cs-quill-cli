import { RuleDetector } from '../detector-registry';
import { BinaryExpression, CallExpression, SyntaxKind } from 'ts-morph';
import { isSuspiciousBarBar } from './rte-helpers';

export const rte004Detector: RuleDetector = {
  ruleId: 'RTE-004',
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];
    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.BinaryExpression) return;
      const be = node as BinaryExpression;
      if (!isSuspiciousBarBar(be)) return;
      const left = be.getLeft();
      if (left.getKind() === SyntaxKind.CallExpression) {
        const callee = (left as CallExpression).getExpression().getText();
        if (/^(is|has|can|should)[A-Z]/.test(callee) || /^assert/.test(callee)) return;
      }
      findings.push({
        line: be.getStartLineNumber(),
        message:
          '|| 기본값 — 좌변이 falsy(0, "")일 때 의도와 다를 수 있음. null/undefined만 대체하려면 ?? 검토',
      });
    });
    return findings;
  },
};
