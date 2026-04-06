import { RuleDetector } from '../detector-registry';
import { SyntaxKind, Node } from 'ts-morph';

/**
 * CMX-010: 삼항 중첩 3단+
 * Detects ternary (conditional) expressions nested 3 or more levels deep.
 */
export const cmx010Detector: RuleDetector = {
  ruleId: 'CMX-010',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const MAX_DEPTH = 3;
    const reported = new Set<number>(); // avoid duplicates by line

    function measureTernaryDepth(node: Node): number {
      if (node.getKind() !== SyntaxKind.ConditionalExpression) return 0;
      let maxChild = 0;
      node.forEachChild(child => {
        const d = measureTernaryDepth(child);
        if (d > maxChild) maxChild = d;
      });
      return maxChild + 1;
    }

    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.ConditionalExpression) {
        // Only check top-level ternaries (parent is not a ternary)
        const parent = node.getParent();
        if (parent && parent.getKind() === SyntaxKind.ConditionalExpression) return;

        const depth = measureTernaryDepth(node);
        const line = node.getStartLineNumber();
        if (depth >= MAX_DEPTH && !reported.has(line)) {
          reported.add(line);
          findings.push({
            line,
            message: `삼항 연산자가 ${depth}단 중첩되어 ${MAX_DEPTH}단 제한을 초과합니다.`,
          });
        }
      }
    });

    return findings;
  },
};
