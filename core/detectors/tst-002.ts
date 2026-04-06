import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: test
 * Severity: high | Confidence: medium
 */
export const tst002Detector: RuleDetector = {
  ruleId: 'TST-002', // setTimeout 비결정적 테스트
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for setTimeout 비결정적 테스트
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'setTimeout 비결정적 테스트 위반' });
      // }
    });
    */

    return findings;
  }
};
