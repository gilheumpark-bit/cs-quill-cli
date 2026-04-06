import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: async
 */
export const asy012Detector: RuleDetector = {
  ruleId: 'ASY-012', // setTimeout 내 throw
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.CallExpression) {
        const expr = (node as any).getExpression().getText();
        if (expr === 'setTimeout' || expr === 'setInterval') {
          node.forEachDescendant(inner => {
            if (inner.getKind() === SyntaxKind.ThrowStatement) {
              findings.push({ line: inner.getStartLineNumber(), message: 'setTimeout 내 throw 금지' });
            }
          });
        }
      }
    });
    return findings;
  }
};
