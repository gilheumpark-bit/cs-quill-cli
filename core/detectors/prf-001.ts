import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: performance
 * Severity: high | Confidence: medium
 */
export const prf001Detector: RuleDetector = {
  ruleId: 'PRF-001', // 루프 내 DOM 조작 반복
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    const loops = [
      ...sourceFile.getDescendantsOfKind(SyntaxKind.ForStatement),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.ForInStatement),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.ForOfStatement),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.WhileStatement),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.DoStatement)
    ];

    const domMethods = new Set([
      'appendChild', 'insertBefore', 'removeChild', 'replaceChild',
      'insertAdjacentHTML', 'querySelector', 'querySelectorAll', 'getElementById'
    ]);
    const domProps = new Set(['innerHTML', 'outerHTML', 'textContent']);

    for (const loop of loops) {
      const calls = loop.getDescendantsOfKind(SyntaxKind.CallExpression);
      for (const call of calls) {
        const expr = call.getExpression();
        if (expr.isKind(SyntaxKind.PropertyAccessExpression)) {
          const propName = expr.getName();
          if (domMethods.has(propName)) {
             findings.push({ line: call.getStartLineNumber(), message: `루프 내 DOM 조작 반복 위반: ${propName}` });
          }
        }
      }

      const binaryExprs = loop.getDescendantsOfKind(SyntaxKind.BinaryExpression);
      for (const bin of binaryExprs) {
        const left = bin.getLeft();
        if (left.isKind(SyntaxKind.PropertyAccessExpression)) {
           const propName = left.getName();
           if (domProps.has(propName)) {
             const operator = bin.getOperatorToken().getKind();
             if (operator === SyntaxKind.EqualsToken || operator === SyntaxKind.PlusEqualsToken) {
               findings.push({ line: left.getStartLineNumber(), message: `루프 내 DOM 조작 반복 위반: ${propName}` });
             }
           }
        }
      }
    }

    return Array.from(new Map(findings.map(f => [`${f.line}:${f.message}`, f])).values());
  }
};
