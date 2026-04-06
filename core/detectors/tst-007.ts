import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: test
 * Severity: high | Confidence: medium
 */
export const tst007Detector: RuleDetector = {
  ruleId: 'TST-007', // shared state 오염
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for shared state 오염
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'shared state 오염 위반' });
      // }
    });
    */

    return findings;
  }
};
