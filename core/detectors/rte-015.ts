import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: runtime
 * Severity: high | Confidence: medium
 */
export const rte015Detector: RuleDetector = {
  ruleId: 'RTE-015', // 루프 내 배열 수정
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 루프 내 배열 수정
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '루프 내 배열 수정 위반' });
      // }
    });
    */

    return findings;
  }
};
