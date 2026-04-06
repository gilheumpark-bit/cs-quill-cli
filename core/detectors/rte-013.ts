import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: runtime
 * Severity: high | Confidence: low
 */
export const rte013Detector: RuleDetector = {
  ruleId: 'RTE-013', // 스택 오버플로 재귀 깊이
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 스택 오버플로 재귀 깊이
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '스택 오버플로 재귀 깊이 위반' });
      // }
    });
    */

    return findings;
  }
};
