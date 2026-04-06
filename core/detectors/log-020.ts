import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: logic
 * Severity: medium | Confidence: medium
 */
export const log020Detector: RuleDetector = {
  ruleId: 'LOG-020', // 얕은 복사 깊은 수정 원본 영향
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 얕은 복사 깊은 수정 원본 영향
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '얕은 복사 깊은 수정 원본 영향 위반' });
      // }
    });
    */

    return findings;
  }
};
