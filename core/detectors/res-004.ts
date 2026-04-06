import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: resource
 * Severity: medium | Confidence: medium
 */
export const res004Detector: RuleDetector = {
  ruleId: 'RES-004', // AbortController 없이 fetch
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    for (const call of calls) {
       const expr = call.getExpression();
       let name = '';
       if (expr.isKind(SyntaxKind.Identifier)) {
          name = expr.getText();
       } else if (expr.isKind(SyntaxKind.PropertyAccessExpression)) {
          name = expr.getName();
       }

       if (name === 'fetch') {
          const args = call.getArguments();
          let hasSignal = false;
          if (args.length >= 2) {
             const options = args[1];
             if (options.isKind(SyntaxKind.ObjectLiteralExpression)) {
                const props = options.getProperties();
                for (const prop of props) {
                   if (prop.isKind(SyntaxKind.PropertyAssignment) || prop.isKind(SyntaxKind.ShorthandPropertyAssignment)) {
                      if (prop.getName() === 'signal') {
                         hasSignal = true;
                         break;
                      }
                   }
                }
             }
          }
          if (!hasSignal) {
             findings.push({ line: call.getStartLineNumber(), message: 'AbortController 없이 fetch 위반' });
          }
       }
    }

    return findings;
  }
};
