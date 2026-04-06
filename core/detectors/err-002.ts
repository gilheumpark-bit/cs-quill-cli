import { RuleDetector } from '../detector-registry';
import { SyntaxKind, CatchClause, ExpressionStatement, CallExpression } from 'ts-morph';

/**
 * Phase 1 / Rule Category: error-handling
 * Severity: high | Confidence: high
 */
export const err002Detector: RuleDetector = {
  ruleId: 'ERR-002', // catch에서 console.log만
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.CatchClause) {
        const catchClause = node as CatchClause;
        const statements = catchClause.getBlock().getStatements();
        
        if (statements.length === 1 && statements[0].getKind() === SyntaxKind.ExpressionStatement) {
          const exprStmt = statements[0] as ExpressionStatement;
          const expr = exprStmt.getExpression();
          
          if (expr.getKind() === SyntaxKind.CallExpression) {
            const callExpr = expr as CallExpression;
            const callerNode = callExpr.getExpression();
            if (callerNode.getText().startsWith('console.')) {
              findings.push({ 
                line: catchClause.getStartLineNumber(), 
                message: 'Error: catch 블록에서 단순 로그(console)만 남기고 예외를 삼켰습니다 (ERR-002). throw 처리가 필요합니다.' 
              });
            }
          }
        }
      }
    });

    return findings;
  }
};
