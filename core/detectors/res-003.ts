import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: resource
 * Severity: medium | Confidence: medium
 */
export const res003Detector: RuleDetector = {
  ruleId: 'RES-003', // clearTimeout/Interval 누락
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

    let hasSetTimeout = false;
    let hasSetInterval = false;
    let setLines: number[] = [];

    let hasClearTimeout = false;
    let hasClearInterval = false;

    for (const call of calls) {
       const expr = call.getExpression();
       let name = '';
       if (expr.isKind(SyntaxKind.Identifier)) {
          name = expr.getText();
       } else if (expr.isKind(SyntaxKind.PropertyAccessExpression)) {
          name = expr.getName();
       }

       if (name === 'setTimeout') {
          hasSetTimeout = true;
          setLines.push(call.getStartLineNumber());
       } else if (name === 'setInterval') {
          hasSetInterval = true;
          setLines.push(call.getStartLineNumber());
       } else if (name === 'clearTimeout') {
          hasClearTimeout = true;
       } else if (name === 'clearInterval') {
          hasClearInterval = true;
       }
    }

    if ((hasSetTimeout && !hasClearTimeout) || (hasSetInterval && !hasClearInterval)) {
       for (const line of setLines) {
           findings.push({ line, message: 'clearTimeout/Interval 누락 위반' });
       }
    }

    return findings;
  }
};
