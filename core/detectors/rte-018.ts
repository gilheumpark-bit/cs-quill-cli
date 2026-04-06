import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

export const rte018Detector: RuleDetector = {
  ruleId: 'RTE-018',
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];
    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.SwitchStatement) return;
      const sw = node as import('ts-morph').SwitchStatement;
      const hasDefault = sw.getCaseBlock().getClauses().some((c) => c.getKind() === SyntaxKind.DefaultClause);
      if (!hasDefault) {
        findings.push({
          line: sw.getStartLineNumber(),
          message: 'switch에 default 없음 — 처리 누락 가능',
        });
      }
    });
    return findings;
  },
};
