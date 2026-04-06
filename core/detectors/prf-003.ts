import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: performance
 * Severity: medium | Confidence: medium
 */
export const prf003Detector: RuleDetector = {
  ruleId: 'PRF-003', // JSON.parse(JSON.stringify()) 깊은 복사
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    for (const call of calls) {
      const expr = call.getExpression();
      if (expr.getText() === 'JSON.parse' || (expr.isKind(SyntaxKind.PropertyAccessExpression) && expr.getExpression().getText() === 'JSON' && expr.getName() === 'parse')) {
        const args = call.getArguments();
        if (args.length > 0) {
          const firstArg = args[0];
          if (firstArg.isKind(SyntaxKind.CallExpression)) {
             const innerExpr = firstArg.getExpression();
             if (innerExpr.getText() === 'JSON.stringify' || (innerExpr.isKind(SyntaxKind.PropertyAccessExpression) && innerExpr.getExpression().getText() === 'JSON' && innerExpr.getName() === 'stringify')) {
               findings.push({ line: call.getStartLineNumber(), message: 'JSON.parse(JSON.stringify()) 깊은 복사 위반' });
             }
          }
        }
      }
    }

    return findings;
  }
};
