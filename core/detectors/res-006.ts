import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: resource
 * Severity: high | Confidence: medium
 */
export const res006Detector: RuleDetector = {
  ruleId: 'RES-006', // Event emitter 리스너 leak
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for Event emitter 리스너 leak
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'Event emitter 리스너 leak 위반' });
      // }
    });
    */

    return findings;
  }
};
