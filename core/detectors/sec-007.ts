import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: security
 * Severity: critical | Confidence: high
 */
export const sec007Detector: RuleDetector = {
  ruleId: 'SEC-007', // Prototype Pollution
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for Prototype Pollution
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'Prototype Pollution 위반' });
      // }
    });
    */

    return findings;
  }
};
