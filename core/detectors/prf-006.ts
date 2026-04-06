import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: performance
 * Severity: high | Confidence: medium
 */
export const prf006Detector: RuleDetector = {
  ruleId: 'PRF-006', // Event listener 누적
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for Event listener 누적
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'Event listener 누적 위반' });
      // }
    });
    */

    return findings;
  }
};
