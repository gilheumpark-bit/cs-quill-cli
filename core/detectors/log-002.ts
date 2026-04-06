import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: logic
 * Severity: high | Confidence: high
 */
export const log002Detector: RuleDetector = {
  ruleId: 'LOG-002', // != loose inequality
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for != loose inequality
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '!= loose inequality 위반' });
      // }
    });
    */

    return findings;
  }
};
