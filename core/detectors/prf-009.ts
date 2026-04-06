import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: performance
 * Severity: high | Confidence: medium
 */
export const prf009Detector: RuleDetector = {
  ruleId: 'PRF-009', // scroll 이벤트 레이아웃 강제
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for scroll 이벤트 레이아웃 강제
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'scroll 이벤트 레이아웃 강제 위반' });
      // }
    });
    */

    return findings;
  }
};
