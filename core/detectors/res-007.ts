import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: resource
 * Severity: medium | Confidence: low
 */
export const res007Detector: RuleDetector = {
  ruleId: 'RES-007', // 전역 캐시 무한 성장
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 전역 캐시 무한 성장
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '전역 캐시 무한 성장 위반' });
      // }
    });
    */

    return findings;
  }
};
