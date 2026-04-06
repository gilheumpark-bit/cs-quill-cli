import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: async
 * Severity: critical | Confidence: high
 */
export const asy003Detector: RuleDetector = {
  ruleId: 'ASY-003', // Unhandled Promise rejection
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for Unhandled Promise rejection
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'Unhandled Promise rejection 위반' });
      // }
    });
    */

    return findings;
  }
};
