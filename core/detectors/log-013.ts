import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: logic
 * Severity: low | Confidence: medium
 */
export const log013Detector: RuleDetector = {
  ruleId: 'LOG-013', // .filter().map() vs .reduce()
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for .filter().map() vs .reduce()
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '.filter().map() vs .reduce() 위반' });
      // }
    });
    */

    return findings;
  }
};
