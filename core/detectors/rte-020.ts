import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: runtime
 * Severity: medium | Confidence: medium
 */
export const rte020Detector: RuleDetector = {
  ruleId: 'RTE-020', // dead branch
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for dead branch
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'dead branch 위반' });
      // }
    });
    */

    return findings;
  }
};
