import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: resource
 * Severity: high | Confidence: medium
 */
export const res006Detector: RuleDetector = {
  ruleId: 'RES-006', // Event emitter 리스너 leak
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

    let hasOn = false;
    let onLines: number[] = [];
    let hasOff = false;

    for (const call of calls) {
       const expr = call.getExpression();
       if (expr.isKind(SyntaxKind.PropertyAccessExpression)) {
          const propName = expr.getName();
          if (propName === 'on' || propName === 'addListener') {
             hasOn = true;
             onLines.push(call.getStartLineNumber());
          } else if (propName === 'off' || propName === 'removeListener' || propName === 'removeAllListeners') {
             hasOff = true;
          }
       }
    }

    if (hasOn && !hasOff) {
       for (const line of onLines) {
           findings.push({ line, message: 'Event emitter 리스너 leak 위반' });
       }
    }

    return findings;
  }
};
