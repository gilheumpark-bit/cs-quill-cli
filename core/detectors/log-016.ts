import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: logic
 * Severity: medium | Confidence: medium
 */
export const log016Detector: RuleDetector = {
  ruleId: 'LOG-016', // 부동소수점 직접 비교
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 부동소수점 직접 비교
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '부동소수점 직접 비교 위반' });
      // }
    });
    */

    return findings;
  }
};
