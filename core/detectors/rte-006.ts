import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: runtime
 * Severity: high | Confidence: medium
 */
export const rte006Detector: RuleDetector = {
  ruleId: 'RTE-006', // arr[0] 빈 배열 가능성
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for arr[0] 빈 배열 가능성
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'arr[0] 빈 배열 가능성 위반' });
      // }
    });
    */

    return findings;
  }
};
