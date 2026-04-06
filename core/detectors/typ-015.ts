import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

function peelExpr(node: import('ts-morph').Node): import('ts-morph').Node {
  let n = node;
  while (n.getKind() === SyntaxKind.ParenthesizedExpression) {
    const inner = (n as import('ts-morph').ParenthesizedExpression).getExpression();
    n = inner;
  }
  return n;
}

/**
 * 객체 리터럴·배열 리터럴에 대한 불필요한 optional chaining
 * Phase / Rule Category: type
 */
export const typ015Detector: RuleDetector = {
  ruleId: 'TYP-015', // optional chaining 과용
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];

    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.PropertyAccessExpression) return;
      const pae = node as import('ts-morph').PropertyAccessExpression;
      const q = (pae.compilerNode as { questionDotToken?: unknown }).questionDotToken;
      if (!q) return;

      const inner = peelExpr(pae.getExpression());
      const k = inner.getKind();
      if (k === SyntaxKind.ObjectLiteralExpression || k === SyntaxKind.ArrayLiteralExpression) {
        findings.push({
          line: node.getStartLineNumber(),
          message: '리터럴에 대한 optional chaining — 불필요할 수 있음',
        });
      }
    });

    return findings;
  },
};
