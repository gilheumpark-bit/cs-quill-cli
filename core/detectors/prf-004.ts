import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: performance
 * Severity: high | Confidence: high
 */
export const prf004Detector: RuleDetector = {
  ruleId: 'PRF-004', // await in loop → Promise.all
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
      const awaits = loop.getDescendantsOfKind(SyntaxKind.AwaitExpression);
      for (const awaitExpr of awaits) {
         findings.push({ line: awaitExpr.getStartLineNumber(), message: 'await in loop → Promise.all 위반' });
      }
    }

    return Array.from(new Map(findings.map(f => [`${f.line}:${f.message}`, f])).values());
  }
};
