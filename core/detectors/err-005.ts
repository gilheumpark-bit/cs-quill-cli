import { RuleDetector } from '../detector-registry';
import { SyntaxKind, ThrowStatement } from 'ts-morph';

export const err005Detector: RuleDetector = {
  ruleId: 'ERR-005', // 'error-handling', 문자열 throw
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.ThrowStatement) {
        const throwStmt = node as ThrowStatement;
        const expr = throwStmt.getExpression();
        
        // throw "error message"; 같은 StringLiteral 검출
        if (expr && expr.getKind() === SyntaxKind.StringLiteral) {
          findings.push({
            line: throwStmt.getStartLineNumber(),
            message: `문자열을 직접 throw 하고 있습니다 (${expr.getText()}). throw new Error(...) 구조를 사용해야 stack trace가 보존됩니다.`,
          });
        }
      }
    });

    return findings;
  }
};
