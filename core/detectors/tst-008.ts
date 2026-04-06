import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: test
 * Severity: medium | Confidence: low
 */
export const tst008Detector: RuleDetector = {
  ruleId: 'TST-008', // happy path만 커버
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for happy path만 커버
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'happy path만 커버 위반' });
      // }
    });
    */

    return findings;
  }
};
