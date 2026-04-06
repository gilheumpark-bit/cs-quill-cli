import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: variable
 * Severity: medium | Confidence: medium
 */
export const var011Detector: RuleDetector = {
  ruleId: 'VAR-011', // 전역 오염 window 직접 할당
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 전역 오염 window 직접 할당
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '전역 오염 window 직접 할당 위반' });
      // }
    });
    */

    return findings;
  }
};
