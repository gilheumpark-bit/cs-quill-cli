import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: performance
 * Severity: high | Confidence: low
 */
export const prf002Detector: RuleDetector = {
  ruleId: 'PRF-002', // O(n²) 중첩 루프 선형 탐색
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for O(n²) 중첩 루프 선형 탐색
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'O(n²) 중첩 루프 선형 탐색 위반' });
      // }
    });
    */

    return findings;
  }
};
