import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: security
 * Severity: high | Confidence: medium
 */
export const sec027Detector: RuleDetector = {
  ruleId: 'SEC-027', // CSRF 토큰 미사용
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for CSRF 토큰 미사용
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'CSRF 토큰 미사용 위반' });
      // }
    });
    */

    return findings;
  }
};
