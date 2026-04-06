import { RuleDetector } from '../detector-registry';
import { SyntaxKind, Node } from 'ts-morph';

/**
 * CMX-009: Cognitive Complexity 15 초과
 * Simplified cognitive complexity: increments for nesting + structural complexity.
 * Nesting increments grow with depth; breaks in linear flow add extra weight.
 */
export const cmx009Detector: RuleDetector = {
  ruleId: 'CMX-009',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const MAX_COG = 15;

    const incrementKinds = new Set([
      SyntaxKind.IfStatement,
      SyntaxKind.ForStatement,
      SyntaxKind.ForInStatement,
      SyntaxKind.ForOfStatement,
      SyntaxKind.WhileStatement,
      SyntaxKind.DoStatement,
      SyntaxKind.SwitchStatement,
      SyntaxKind.CatchClause,
      SyntaxKind.ConditionalExpression,
    ]);
    const nestingKinds = new Set([
      SyntaxKind.IfStatement,
      SyntaxKind.ForStatement,
      SyntaxKind.ForInStatement,
      SyntaxKind.ForOfStatement,
      SyntaxKind.WhileStatement,
      SyntaxKind.DoStatement,
      SyntaxKind.SwitchStatement,
      SyntaxKind.CatchClause,
    ]);

    function calcCognitive(node: Node, nestingLevel: number): number {
      let score = 0;
      node.forEachChild(child => {
        if (incrementKinds.has(child.getKind())) {
          score += 1 + nestingLevel; // structural + nesting increment
        }
        // Logical operators add 1 each (no nesting penalty)
        if (child.getKind() === SyntaxKind.BinaryExpression) {
          const op = (child as any).getOperatorToken().getKind();
          if (op === SyntaxKind.AmpersandAmpersandToken || op === SyntaxKind.BarBarToken) {
            score += 1;
          }
        }
        const nextNesting = nestingKinds.has(child.getKind()) ? nestingLevel + 1 : nestingLevel;
        score += calcCognitive(child, nextNesting);
      });
      return score;
    }

    sourceFile.forEachDescendant(node => {
      const kind = node.getKind();
      if (
        kind === SyntaxKind.FunctionDeclaration ||
        kind === SyntaxKind.MethodDeclaration ||
        kind === SyntaxKind.ArrowFunction ||
        kind === SyntaxKind.FunctionExpression
      ) {
        const body = (node as any).getBody?.();
        if (body) {
          const cog = calcCognitive(body, 0);
          if (cog > MAX_COG) {
            const name = (node as any).getName?.() ?? '(anonymous)';
            findings.push({
              line: node.getStartLineNumber(),
              message: `함수 '${name}'의 Cognitive Complexity가 ${cog}으로 ${MAX_COG} 제한을 초과합니다.`,
            });
          }
        }
      }
    });

    return findings;
  },
};
