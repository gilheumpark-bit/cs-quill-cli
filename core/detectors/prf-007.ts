import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: performance
 * Severity: medium | Confidence: low
 */
export const prf007Detector: RuleDetector = {
  ruleId: 'PRF-007', // .find() 반복 → Map 최적화
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    const loops = [
      ...sourceFile.getDescendantsOfKind(SyntaxKind.ForStatement),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.ForInStatement),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.ForOfStatement),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.WhileStatement),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.DoStatement)
    ];

    for (const loop of loops) {
      const calls = loop.getDescendantsOfKind(SyntaxKind.CallExpression);
      for (const call of calls) {
        const expr = call.getExpression();
        if (expr.isKind(SyntaxKind.PropertyAccessExpression)) {
          const propName = expr.getName();
          if (propName === 'find') {
             findings.push({ line: call.getStartLineNumber(), message: '.find() 반복 → Map 최적화 위반' });
          }
        }
      }
    }

    return Array.from(new Map(findings.map(f => [`${f.line}:${f.message}`, f])).values());
  }
};
