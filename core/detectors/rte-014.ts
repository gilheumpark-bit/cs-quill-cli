import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: runtime
 * Severity: high | Confidence: medium
 */
export const rte014Detector: RuleDetector = {
  ruleId: 'RTE-014', // off-by-one error
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for off-by-one error
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'off-by-one error 위반' });
      // }
    });
    */

    return findings;
  }
};
