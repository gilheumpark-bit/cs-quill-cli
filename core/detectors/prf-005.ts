import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: performance
 * Severity: medium | Confidence: low
 */
export const prf005Detector: RuleDetector = {
  ruleId: 'PRF-005', // 메모이제이션 없이 비싼 연산 반복
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 메모이제이션 없이 비싼 연산 반복
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '메모이제이션 없이 비싼 연산 반복 위반' });
      // }
    });
    */

    return findings;
  }
};
