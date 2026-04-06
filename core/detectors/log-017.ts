import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: logic
 * Severity: medium | Confidence: medium
 */
export const log017Detector: RuleDetector = {
  ruleId: 'LOG-017', // 정수 나눗셈 Math.floor 없음
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 정수 나눗셈 Math.floor 없음
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '정수 나눗셈 Math.floor 없음 위반' });
      // }
    });
    */

    return findings;
  }
};
