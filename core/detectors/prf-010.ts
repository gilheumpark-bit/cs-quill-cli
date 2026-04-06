import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: performance
 * Severity: medium | Confidence: low
 */
export const prf010Detector: RuleDetector = {
  ruleId: 'PRF-010', // 전체 상태 구독
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 전체 상태 구독
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '전체 상태 구독 위반' });
      // }
    });
    */

    return findings;
  }
};
