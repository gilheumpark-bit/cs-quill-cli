import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: test
 * Severity: high | Confidence: high
 */
export const tst001Detector: RuleDetector = {
  ruleId: 'TST-001', // 빈 테스트 — assertion 없음
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 빈 테스트 — assertion 없음
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '빈 테스트 — assertion 없음 위반' });
      // }
    });
    */

    return findings;
  }
};
