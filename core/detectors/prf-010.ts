import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: performance
 * Severity: medium | Confidence: low
 */
export const prf010Detector: RuleDetector = {
  ruleId: 'PRF-010', // 전체 상태 구독
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    for (const call of calls) {
       const expr = call.getExpression();
       if (expr.getText() === 'useSelector') {
          const args = call.getArguments();
          if (args.length > 0) {
             const selector = args[0];
             if (selector.isKind(SyntaxKind.ArrowFunction)) {
                const body = selector.getBody();
                const params = selector.getParameters();
                if (params.length > 0) {
                   const paramName = params[0].getName();
                   if (body.getText() === paramName) {
                      findings.push({ line: call.getStartLineNumber(), message: '전체 상태 구독 위반 (useSelector)' });
                   }
                }
             }
          }
       }
    }

    return findings;
  }
};
