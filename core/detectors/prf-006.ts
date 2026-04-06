import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: performance
 * Severity: high | Confidence: medium
 */
export const prf006Detector: RuleDetector = {
  ruleId: 'PRF-006', // Event listener 누적
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // Heuristic: check if addEventListener is used without removeEventListener in the same file/scope
    const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

    let hasAdd = false;
    let addLines: number[] = [];
    let hasRemove = false;

    for (const call of calls) {
       const expr = call.getExpression();
       if (expr.isKind(SyntaxKind.PropertyAccessExpression)) {
          const propName = expr.getName();
          if (propName === 'addEventListener') {
             hasAdd = true;
             addLines.push(call.getStartLineNumber());
          } else if (propName === 'removeEventListener') {
             hasRemove = true;
          }
       }
    }

    if (hasAdd && !hasRemove) {
       for (const line of addLines) {
           findings.push({ line, message: 'Event listener 누적 위반 (removeEventListener 없음)' });
       }
    }

    return findings;
  }
};
