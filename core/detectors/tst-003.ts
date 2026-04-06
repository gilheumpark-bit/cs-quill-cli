import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: test
 * Severity: high | Confidence: medium
 */
export const tst003Detector: RuleDetector = {
  ruleId: 'TST-003', // mock 미설정 외부 실제 호출
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for mock 미설정 외부 실제 호출
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'mock 미설정 외부 실제 호출 위반' });
      // }
    });
    */

    return findings;
  }
};
