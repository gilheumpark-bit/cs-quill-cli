import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: security
 * Severity: medium | Confidence: high
 */
export const sec022Detector: RuleDetector = {
  ruleId: 'SEC-022', // 프로덕션 디버그 잔류
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 프로덕션 디버그 잔류
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '프로덕션 디버그 잔류 위반' });
      // }
    });
    */

    return findings;
  }
};
