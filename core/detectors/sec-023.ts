import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: security
 * Severity: medium | Confidence: medium
 */
export const sec023Detector: RuleDetector = {
  ruleId: 'SEC-023', // 내부 IP 하드코딩
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 내부 IP 하드코딩
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '내부 IP 하드코딩 위반' });
      // }
    });
    */

    return findings;
  }
};
