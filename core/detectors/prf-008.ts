import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: performance
 * Severity: low | Confidence: medium
 */
export const prf008Detector: RuleDetector = {
  ruleId: 'PRF-008', // RegExp 루프 내 매번 생성
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for RegExp 루프 내 매번 생성
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'RegExp 루프 내 매번 생성 위반' });
      // }
    });
    */

    return findings;
  }
};
