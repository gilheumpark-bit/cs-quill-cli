import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: performance
 * Severity: high | Confidence: low
 */
export const prf002Detector: RuleDetector = {
  ruleId: 'PRF-002', // O(n²) 중첩 루프 선형 탐색
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    const loops = [
      ...sourceFile.getDescendantsOfKind(SyntaxKind.ForStatement),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.ForInStatement),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.ForOfStatement),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.WhileStatement),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.DoStatement)
    ];

    const arrayLinearMethods = new Set(['find', 'findIndex', 'filter', 'indexOf', 'includes', 'some', 'every']);

    for (const loop of loops) {
      const nestedLoops = [
        ...loop.getDescendantsOfKind(SyntaxKind.ForStatement),
        ...loop.getDescendantsOfKind(SyntaxKind.ForInStatement),
        ...loop.getDescendantsOfKind(SyntaxKind.ForOfStatement),
        ...loop.getDescendantsOfKind(SyntaxKind.WhileStatement),
        ...loop.getDescendantsOfKind(SyntaxKind.DoStatement)
      ];

      for (const nested of nestedLoops) {
        if (nested !== loop) {
           findings.push({ line: nested.getStartLineNumber(), message: 'O(n²) 중첩 루프 선형 탐색 위반 (중첩 루프)' });
        }
      }

      const calls = loop.getDescendantsOfKind(SyntaxKind.CallExpression);
      for (const call of calls) {
        const expr = call.getExpression();
        if (expr.isKind(SyntaxKind.PropertyAccessExpression)) {
          const propName = expr.getName();
          if (arrayLinearMethods.has(propName)) {
            findings.push({ line: call.getStartLineNumber(), message: `O(n²) 중첩 루프 선형 탐색 위반: Array.${propName}()` });
          }
        }
      }
    }

    return Array.from(new Map(findings.map(f => [`${f.line}:${f.message}`, f])).values());
  }
};
