import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: security
 * Severity: high | Confidence: medium
 */
export const sec008Detector: RuleDetector = {
  ruleId: 'SEC-008', // ReDoS 취약 정규식
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for ReDoS 취약 정규식
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'ReDoS 취약 정규식 위반' });
      // }
    });
    */

    return findings;
  }
};
