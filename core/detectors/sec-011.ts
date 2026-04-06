import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: security
 * Severity: high | Confidence: high
 */
export const sec011Detector: RuleDetector = {
  ruleId: 'SEC-011', // 약한 해시 MD5/SHA1
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 약한 해시 MD5/SHA1
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '약한 해시 MD5/SHA1 위반' });
      // }
    });
    */

    return findings;
  }
};
