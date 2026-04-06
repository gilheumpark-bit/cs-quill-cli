import { RuleDetector } from '../detector-registry';
import { PropertyAccessExpression, SyntaxKind } from 'ts-morph';
import {
  expressionRootHasOptionalChain,
  typeHasNull,
  typeHasUndefined,
} from './rte-helpers';

/** optional chaining 미사용: null·undefined 모두 가능한 직접 접근 */
export const rte003Detector: RuleDetector = {
  ruleId: 'RTE-003',
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];
    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.PropertyAccessExpression) return;
      const pae = node as PropertyAccessExpression;
      if (expressionRootHasOptionalChain(pae)) return;
      const expr = pae.getExpression();
      try {
        const t = expr.getType();
        if (typeHasNull(t) && typeHasUndefined(t)) {
          findings.push({
            line: pae.getStartLineNumber(),
            message: 'optional chaining(?. ) 미사용 — null/undefined 동시 가능 시 직접 . 접근 위험',
          });
        }
      } catch {
        /* ignore */
      }
    });
    return findings;
  },
};
