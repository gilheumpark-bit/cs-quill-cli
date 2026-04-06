import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: type
 */
export const typ005Detector: RuleDetector = {
  ruleId: 'TYP-005', // {} empty object type
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.TypeLiteral) {
        if ((node as any).getMembers().length === 0) {
          findings.push({ line: node.getStartLineNumber(), message: '{} empty object type 위반' });
        }
      }
    });
    return findings;
  }
};
