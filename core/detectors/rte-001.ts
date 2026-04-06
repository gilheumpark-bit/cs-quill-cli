import { RuleDetector } from '../detector-registry';
import { PropertyAccessExpression, SyntaxKind } from 'ts-morph';
import {
  expressionRootHasOptionalChain,
  typeHasNull,
} from './rte-helpers';

export const rte001Detector: RuleDetector = {
  ruleId: 'RTE-001',
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];
    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.PropertyAccessExpression) return;
      const pae = node as PropertyAccessExpression;
      if (expressionRootHasOptionalChain(pae)) return;
      const expr = pae.getExpression();
      try {
        const t = expr.getType();
        if (typeHasNull(t)) {
          findings.push({
            line: pae.getStartLineNumber(),
            message: 'null 가능 타입에 대한 직접 속성 접근 — ?. 또는 null 검사 권장',
          });
        }
      } catch {
        /* 타입 추론 실패 시 스킵 */
      }
    });
    return findings;
  },
};
