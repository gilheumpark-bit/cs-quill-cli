import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: type
 */
export const typ003Detector: RuleDetector = {
  ruleId: 'TYP-003', // unsafe type assertion
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];

    sourceFile.forEachDescendant((node) => {
      if (node.getKind() === SyntaxKind.AsExpression || node.getKind() === SyntaxKind.TypeAssertionExpression) {
        const text = node.getText();
        if (/as\s+unknown\s+as\b/i.test(text)) {
          findings.push({ line: node.getStartLineNumber(), message: 'unsafe 이중 단언 (as unknown as)' });
          return;
        }
        const typeNode = (node as { getTypeNode?: () => import('ts-morph').TypeNode }).getTypeNode?.();
        if (typeNode && typeNode.getKind() === SyntaxKind.AnyKeyword) {
          findings.push({ line: node.getStartLineNumber(), message: 'unsafe type assertion (as any 등)' });
        }
      }
    });
    return findings;
  },
};
