import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: performance
 * Severity: medium | Confidence: low
 */
export const prf005Detector: RuleDetector = {
  ruleId: 'PRF-005', // 메모이제이션 없이 비싼 연산 반복
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // React components are usually functions starting with capital letter
    const funcDecls = sourceFile.getDescendantsOfKind(SyntaxKind.FunctionDeclaration);
    const arrowFuncs = sourceFile.getDescendantsOfKind(SyntaxKind.ArrowFunction);
    const funcExprs = sourceFile.getDescendantsOfKind(SyntaxKind.FunctionExpression);

    const allFuncs = [...funcDecls, ...arrowFuncs, ...funcExprs];

    const expensiveMethods = new Set(['map', 'filter', 'reduce', 'sort']);

    for (const func of allFuncs) {
       let isReactComponent = false;
       if (func.isKind(SyntaxKind.FunctionDeclaration)) {
          const name = func.getName();
          if (name && /^[A-Z]/.test(name)) {
             isReactComponent = true;
          }
       } else {
          const parent = func.getParent();
          if (parent && parent.isKind(SyntaxKind.VariableDeclaration)) {
             const name = parent.getName();
             if (name && /^[A-Z]/.test(name)) {
                isReactComponent = true;
             }
          }
       }

       if (isReactComponent) {
          const calls = func.getDescendantsOfKind(SyntaxKind.CallExpression);
          for (const call of calls) {
             const expr = call.getExpression();
             if (expr.isKind(SyntaxKind.PropertyAccessExpression)) {
                const propName = expr.getName();
                if (expensiveMethods.has(propName)) {
                   // Check if it's wrapped in useMemo
                   let current: any = call;
                   let isMemoized = false;
                   while (current && current !== func) {
                      if (current.isKind(SyntaxKind.CallExpression)) {
                         const parentExpr = current.getExpression();
                         if (parentExpr.getText() === 'useMemo') {
                            isMemoized = true;
                            break;
                         }
                      }
                      current = current.getParent();
                   }
                   if (!isMemoized) {
                      findings.push({ line: call.getStartLineNumber(), message: `메모이제이션 없이 비싼 연산 반복 위반: ${propName}` });
                   }
                }
             }
          }
       }
    }

    return Array.from(new Map(findings.map(f => [`${f.line}:${f.message}`, f])).values());
  }
};
