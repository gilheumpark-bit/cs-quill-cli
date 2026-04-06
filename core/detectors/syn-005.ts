import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: syntax
 * Severity: high | Confidence: high
 */
export const syn005Detector: RuleDetector = {
  ruleId: 'SYN-005', // 예약어 식별자 사용
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 예약어 식별자 사용
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '예약어 식별자 사용 위반' });
      // }
    });
    */

    return findings;
  }
};
