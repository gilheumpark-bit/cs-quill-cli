import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: runtime
 * Severity: medium | Confidence: medium
 */
export const rte017Detector: RuleDetector = {
  ruleId: 'RTE-017', // switch fall-through
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for switch fall-through
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'switch fall-through 위반' });
      // }
    });
    */

    return findings;
  }
};
