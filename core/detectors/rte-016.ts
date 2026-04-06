import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: runtime
 * Severity: high | Confidence: high
 */
export const rte016Detector: RuleDetector = {
  ruleId: 'RTE-016', // for...in on Array
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for for...in on Array
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'for...in on Array 위반' });
      // }
    });
    */

    return findings;
  }
};
