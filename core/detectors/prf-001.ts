import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: performance
 * Severity: high | Confidence: medium
 */
export const prf001Detector: RuleDetector = {
  ruleId: 'PRF-001', // 루프 내 DOM 조작 반복
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 루프 내 DOM 조작 반복
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '루프 내 DOM 조작 반복 위반' });
      // }
    });
    */

    return findings;
  }
};
