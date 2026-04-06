import { RuleDetector } from '../detector-registry';
import { SyntaxKind, Node } from 'ts-morph';

/**
 * CMX-008: Cyclomatic Complexity 10 초과
 * Counts decision points (if, for, while, case, catch, &&, ||, ?:) per function.
 */
export const cmx008Detector: RuleDetector = {
  ruleId: 'CMX-008',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const MAX_CC = 10;
    const decisionKinds = new Set([
      SyntaxKind.IfStatement,
      SyntaxKind.ForStatement,
      SyntaxKind.ForInStatement,
      SyntaxKind.ForOfStatement,
      SyntaxKind.WhileStatement,
      SyntaxKind.DoStatement,
      SyntaxKind.CaseClause,
      SyntaxKind.CatchClause,
      SyntaxKind.ConditionalExpression,
    ]);
    const logicalOps = new Set([
      SyntaxKind.AmpersandAmpersandToken,
      SyntaxKind.BarBarToken,
    ]);

    function countCC(node: Node): number {
      let cc = 0;
      node.forEachDescendant(child => {
        if (decisionKinds.has(child.getKind())) cc++;
        if (
          child.getKind() === SyntaxKind.BinaryExpression &&
          logicalOps.has((child as any).getOperatorToken().getKind())
        ) {
          cc++;
        }
      });
      return cc + 1; // base path
    }

    sourceFile.forEachDescendant(node => {
      const kind = node.getKind();
      if (
        kind === SyntaxKind.FunctionDeclaration ||
        kind === SyntaxKind.MethodDeclaration ||
        kind === SyntaxKind.ArrowFunction ||
        kind === SyntaxKind.FunctionExpression
      ) {
        const cc = countCC(node);
        if (cc > MAX_CC) {
          const name = (node as any).getName?.() ?? '(anonymous)';
          findings.push({
            line: node.getStartLineNumber(),
            message: `함수 '${name}'의 Cyclomatic Complexity가 ${cc}으로 ${MAX_CC} 제한을 초과합니다.`,
          });
        }
      }
    });

    return findings;
  },
};
