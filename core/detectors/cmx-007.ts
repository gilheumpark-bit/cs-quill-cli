import { RuleDetector } from '../detector-registry';
import { SyntaxKind, Node } from 'ts-morph';

/**
 * CMX-007: 중첩 깊이 5단 초과
 * Detects code blocks nested deeper than 5 levels.
 */
export const cmx007Detector: RuleDetector = {
  ruleId: 'CMX-007',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const MAX_DEPTH = 5;
    const nestingKinds = new Set([
      SyntaxKind.IfStatement,
      SyntaxKind.ForStatement,
      SyntaxKind.ForInStatement,
      SyntaxKind.ForOfStatement,
      SyntaxKind.WhileStatement,
      SyntaxKind.DoStatement,
      SyntaxKind.SwitchStatement,
      SyntaxKind.TryStatement,
    ]);

    function measureDepth(node: Node, depth: number) {
      if (nestingKinds.has(node.getKind())) {
        depth++;
        if (depth > MAX_DEPTH) {
          findings.push({
            line: node.getStartLineNumber(),
            message: `중첩 깊이가 ${depth}단으로 ${MAX_DEPTH}단 제한을 초과합니다.`,
          });
          return; // don't report deeper children of same branch
        }
      }
      node.forEachChild(child => measureDepth(child, depth));
    }

    sourceFile.forEachChild(child => measureDepth(child, 0));

    return findings;
  },
};
