import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: ai-pattern
 * Severity: critical | Confidence: high
 */
export const aip010Detector: RuleDetector = {
  ruleId: 'AIP-010', // Hallucinated API
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for Hallucinated API
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'Hallucinated API 위반' });
      // }
    });
    */

    return findings;
  }
};
