import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: complexity
 * Severity: medium | Confidence: high
 */
export const cmx017Detector: RuleDetector = {
  ruleId: 'CMX-017', // Long Parameter List 7+
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for Long Parameter List 7+
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'Long Parameter List 7+ 위반' });
      // }
    });
    */

    return findings;
  }
};
