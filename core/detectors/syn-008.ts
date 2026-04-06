import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: syntax
 * Severity: medium | Confidence: high
 */
export const syn008Detector: RuleDetector = {
  ruleId: 'SYN-008', // 정규식 플래그 중복
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 정규식 플래그 중복
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '정규식 플래그 중복 위반' });
      // }
    });
    */

    return findings;
  }
};
