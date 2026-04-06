import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: complexity
 * Severity: medium | Confidence: high
 */
export const cmx009Detector: RuleDetector = {
  ruleId: 'CMX-009', // Cognitive Complexity 15 초과
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for Cognitive Complexity 15 초과
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'Cognitive Complexity 15 초과 위반' });
      // }
    });
    */

    return findings;
  }
};
