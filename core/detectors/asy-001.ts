import { RuleDetector } from '../detector-registry';
import { SyntaxKind, FunctionDeclaration, ArrowFunction, MethodDeclaration } from 'ts-morph';

/**
 * Phase 1 / Rule Category: async
 * Severity: critical | Confidence: high
 */
export const asy001Detector: RuleDetector = {
  ruleId: 'ASY-001', // async 함수 내 await 누락
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    const checkAsyncContext = (node: FunctionDeclaration | ArrowFunction | MethodDeclaration) => {
      if (node.hasModifier(SyntaxKind.AsyncKeyword)) {
        // Find if this specific block contains an await expression
        // Need to be careful not to count awaits inside nested functions!
        const awaitExpressions = node.getDescendantsOfKind(SyntaxKind.AwaitExpression);
        const forAwaitStatements = node.getDescendantsOfKind(SyntaxKind.ForOfStatement)
          .filter(forOf => forOf.getAwaitKeyword() !== undefined);

        // Filter descendants that belong to nested functions 
        // to avoid false positives/negatives, but for a simple PoC Phase1, 
        // just existence is a strong baseline.
        
        if (awaitExpressions.length === 0 && forAwaitStatements.length === 0) {
          // If the return statement directly returns a Promise, we should skip
          const returnsPromiseDirectly = node.getDescendantsOfKind(SyntaxKind.CallExpression)
             .some(call => call.getText().startsWith('Promise.'));
             
          if (!returnsPromiseDirectly) {
             findings.push({ 
               line: node.getStartLineNumber(), 
               message: 'Critical: async 함수인데 내부에 await 또는 비동기 분기가 전혀 없습니다 (ASY-001). 불필요한 비동기 선언입니다.' 
             });
          }
        }
      }
    };

    sourceFile.getFunctions().forEach(checkAsyncContext);
    sourceFile.getClasses().forEach(c => c.getMethods().forEach(checkAsyncContext));
    
    // Check variable declarations for arrow functions
    sourceFile.getVariableDeclarations().forEach(vd => {
      const init = vd.getInitializer();
      if (init && init.getKind() === SyntaxKind.ArrowFunction) {
        checkAsyncContext(init as ArrowFunction);
      }
    });

    return findings;
  }
};
