import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: runtime
 * Severity: medium | Confidence: high
 */
export const rte019Detector: RuleDetector = {
  ruleId: 'RTE-019', // unreachable code
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for unreachable code
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'unreachable code 위반' });
      // }
    });
    */

    return findings;
  }
};
