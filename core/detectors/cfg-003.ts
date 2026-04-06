import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: config
 * Severity: medium | Confidence: high
 */
export const cfg003Detector: RuleDetector = {
  ruleId: 'CFG-003', // skipLibCheck: true
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for skipLibCheck: true
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'skipLibCheck: true 위반' });
      // }
    });
    */

    return findings;
  }
};
