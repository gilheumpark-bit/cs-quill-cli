import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: logic
 * Severity: medium | Confidence: medium
 */
export const log014Detector: RuleDetector = {
  ruleId: 'LOG-014', // 원본 배열 변형
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 원본 배열 변형
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '원본 배열 변형 위반' });
      // }
    });
    */

    return findings;
  }
};
