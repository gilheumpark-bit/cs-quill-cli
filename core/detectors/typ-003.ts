import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: type
 */
export const typ003Detector: RuleDetector = {
  ruleId: 'TYP-003', // unsafe type assertion
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.AsExpression || node.getKind() === SyntaxKind.TypeAssertionExpression) {
        const typeNode = (node as any).getTypeNode && (node as any).getTypeNode();
        if (typeNode && typeNode.getKind() === SyntaxKind.AnyKeyword) {
           findings.push({ line: node.getStartLineNumber(), message: 'unsafe type assertion (any) 위반' });
        }
      }
    });
    return findings;
  }
};
