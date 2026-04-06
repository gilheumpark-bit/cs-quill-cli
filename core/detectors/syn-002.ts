import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: syntax
 * Severity: critical | Confidence: high
 */
export const syn002Detector: RuleDetector = {
  ruleId: 'SYN-002', // 소괄호 불균형
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 소괄호 불균형
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '소괄호 불균형 위반' });
      // }
    });
    */

    return findings;
  }
};
