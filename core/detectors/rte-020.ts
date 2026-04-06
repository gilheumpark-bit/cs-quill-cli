import { RuleDetector } from '../detector-registry';
import { IfStatement, SyntaxKind } from 'ts-morph';
import { isDeadBranchCondition } from './rte-helpers';

export const rte020Detector: RuleDetector = {
  ruleId: 'RTE-020',
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];
    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.IfStatement) return;
      const ifs = node as IfStatement;
      const cond = ifs.getExpression();
      const dead = isDeadBranchCondition(cond);
      if (dead === 'always-false') {
        findings.push({
          line: ifs.getStartLineNumber(),
          message: '항상 false인 조건 — dead branch',
        });
      } else if (dead === 'always-true') {
        findings.push({
          line: ifs.getStartLineNumber(),
          message: '항상 true인 조건 — else dead branch 가능',
        });
      }
    });
    return findings;
  },
};
