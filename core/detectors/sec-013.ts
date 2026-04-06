import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: security
 * Severity: critical | Confidence: medium
 */
export const sec013Detector: RuleDetector = {
  ruleId: 'SEC-013', // JWT 서명 검증 없음
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for JWT 서명 검증 없음
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'JWT 서명 검증 없음 위반' });
      // }
    });
    */

    return findings;
  }
};
