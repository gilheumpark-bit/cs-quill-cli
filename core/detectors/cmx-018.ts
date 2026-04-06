import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: complexity
 * Severity: low | Confidence: low
 */
export const cmx018Detector: RuleDetector = {
  ruleId: 'CMX-018', // Feature Envy
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for Feature Envy
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'Feature Envy 위반' });
      // }
    });
    */

    return findings;
  }
};
