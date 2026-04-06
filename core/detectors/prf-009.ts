import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: performance
 * Severity: high | Confidence: medium
 */
export const prf009Detector: RuleDetector = {
  ruleId: 'PRF-009', // scroll 이벤트 레이아웃 강제
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    for (const call of calls) {
       const expr = call.getExpression();
       if (expr.isKind(SyntaxKind.PropertyAccessExpression) && expr.getName() === 'addEventListener') {
          const args = call.getArguments();
          if (args.length >= 2) {
             const eventName = args[0];
             if (eventName.isKind(SyntaxKind.StringLiteral) && eventName.getLiteralValue() === 'scroll') {
                const handler = args[1];

                const layoutProps = new Set([
                   'offsetHeight', 'offsetWidth', 'scrollHeight', 'scrollWidth',
                   'scrollTop', 'scrollLeft', 'clientHeight', 'clientWidth',
                   'getClientRects', 'getBoundingClientRect'
                ]);

                const handlerProps = handler.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression);
                for (const prop of handlerProps) {
                   if (layoutProps.has(prop.getName())) {
                      findings.push({ line: prop.getStartLineNumber(), message: `scroll 이벤트 레이아웃 강제 위반: ${prop.getName()}` });
                   }
                }

                const handlerCalls = handler.getDescendantsOfKind(SyntaxKind.CallExpression);
                for (const hc of handlerCalls) {
                   const he = hc.getExpression();
                   if (he.isKind(SyntaxKind.PropertyAccessExpression) && layoutProps.has(he.getName())) {
                      findings.push({ line: hc.getStartLineNumber(), message: `scroll 이벤트 레이아웃 강제 위반: ${he.getName()}` });
                   }
                }
             }
          }
       }
    }

    return Array.from(new Map(findings.map(f => [`${f.line}:${f.message}`, f])).values());
  }
};
