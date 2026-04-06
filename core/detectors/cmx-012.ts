import { RuleDetector } from '../detector-registry';
import { SyntaxKind, Node } from 'ts-morph';

/**
 * CMX-012: if-else 체인 7개+
 * Detects if-else if chains with 7 or more branches.
 */
export const cmx012Detector: RuleDetector = {
  ruleId: 'CMX-012',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const MAX_CHAIN = 7;
    const visited = new Set<Node>();

    sourceFile.forEachDescendant(node => {
      if (node.getKind() !== SyntaxKind.IfStatement) return;
      if (visited.has(node)) return;

      // Only process top-level if (not an else-if)
      const parent = node.getParent();
      if (parent?.getKind() === SyntaxKind.IfStatement) return;

      let count = 1;
      let current: Node | undefined = node;
      while (current) {
        visited.add(current);
        const elseBlock = (current as any).getElseStatement?.();
        if (!elseBlock) break;
        count++;
        if (elseBlock.getKind() === SyntaxKind.IfStatement) {
          current = elseBlock;
        } else {
          break; // final else block
        }
      }

      if (count >= MAX_CHAIN) {
        findings.push({
          line: node.getStartLineNumber(),
          message: `if-else 체인이 ${count}개로 ${MAX_CHAIN}개 제한을 초과합니다.`,
        });
      }
    });

    return findings;
  },
};
