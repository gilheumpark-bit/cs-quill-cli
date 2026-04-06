import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: runtime
 * Severity: critical | Confidence: medium
 */
export const rte012Detector: RuleDetector = {
  ruleId: 'RTE-012', // 재귀 base case 없음
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 재귀 base case 없음
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '재귀 base case 없음 위반' });
      // }
    });
    */

    return findings;
  }
};
