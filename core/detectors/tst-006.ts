import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: test
 * Severity: low | Confidence: medium
 */
export const tst006Detector: RuleDetector = {
  ruleId: 'TST-006', // 단일 테스트 복수 단위 테스트
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 단일 테스트 복수 단위 테스트
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '단일 테스트 복수 단위 테스트 위반' });
      // }
    });
    */

    return findings;
  }
};
