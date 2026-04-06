import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: test
 * Severity: medium | Confidence: medium
 */
export const tst005Detector: RuleDetector = {
  ruleId: 'TST-005', // hardcoded 날짜 — 미래 실패
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for hardcoded 날짜 — 미래 실패
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'hardcoded 날짜 — 미래 실패 위반' });
      // }
    });
    */

    return findings;
  }
};
