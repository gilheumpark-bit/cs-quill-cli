import { RuleDetector } from '../detector-registry';
import { SyntaxKind, Node } from 'ts-morph';

/**
 * CMX-011: callback hell 4단+
 * Detects callback nesting (nested arrow/function expressions in call arguments) 4+ levels deep.
 */
export const cmx011Detector: RuleDetector = {
  ruleId: 'CMX-011',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const MAX_DEPTH = 4;
    const reported = new Set<number>();

    function measureCallbackDepth(node: Node, depth: number) {
      // A callback is an arrow/function expression passed as argument to a call
      if (
        (node.getKind() === SyntaxKind.ArrowFunction ||
          node.getKind() === SyntaxKind.FunctionExpression) &&
        node.getParent()?.getKind() === SyntaxKind.CallExpression
      ) {
        depth++;
        if (depth >= MAX_DEPTH) {
          const line = node.getStartLineNumber();
          if (!reported.has(line)) {
            reported.add(line);
            findings.push({
              line,
              message: `콜백이 ${depth}단 중첩되어 callback hell (${MAX_DEPTH}단 제한) 을 초과합니다.`,
            });
          }
          return;
        }
      }
      node.forEachChild(child => measureCallbackDepth(child, depth));
    }

    sourceFile.forEachChild(child => measureCallbackDepth(child, 0));

    return findings;
  },
};
