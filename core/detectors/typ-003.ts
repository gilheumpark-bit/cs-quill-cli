import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: type
 * Severity: high | Confidence: medium
 */
export const typ003Detector: RuleDetector = {
  ruleId: 'TYP-003', // unsafe type assertion
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for unsafe type assertion
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'unsafe type assertion 위반' });
      // }
    });
    */

    return findings;
  }
};
