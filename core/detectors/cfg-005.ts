import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: config
 * Severity: medium | Confidence: high
 */
export const cfg005Detector: RuleDetector = {
  ruleId: 'CFG-005', // moduleResolution 부재
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for moduleResolution 부재
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'moduleResolution 부재 위반' });
      // }
    });
    */

    return findings;
  }
};
