import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: test
 * Severity: high | Confidence: high
 */
export const tst004Detector: RuleDetector = {
  ruleId: 'TST-004', // assertion 없이 resolves/rejects
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for assertion 없이 resolves/rejects
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'assertion 없이 resolves/rejects 위반' });
      // }
    });
    */

    return findings;
  }
};
