import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: type
 * Severity: medium | Confidence: high
 */
export const typ005Detector: RuleDetector = {
  ruleId: 'TYP-005', // {} empty object type
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for {} empty object type
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '{} empty object type 위반' });
      // }
    });
    */

    return findings;
  }
};
