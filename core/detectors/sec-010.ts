import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: security
 * Severity: critical | Confidence: medium
 */
export const sec010Detector: RuleDetector = {
  ruleId: 'SEC-010', // 하드코딩 시드/salt
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 하드코딩 시드/salt
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '하드코딩 시드/salt 위반' });
      // }
    });
    */

    return findings;
  }
};
