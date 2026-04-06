import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: variable
 * Severity: medium | Confidence: high
 */
export const var012Detector: RuleDetector = {
  ruleId: 'VAR-012', // dead declaration
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for dead declaration
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'dead declaration 위반' });
      // }
    });
    */

    return findings;
  }
};
