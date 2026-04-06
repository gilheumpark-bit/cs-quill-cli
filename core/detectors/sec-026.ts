import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: security
 * Severity: critical | Confidence: low
 */
export const sec026Detector: RuleDetector = {
  ruleId: 'SEC-026', // 권한 검사 클라이언트만
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 권한 검사 클라이언트만
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '권한 검사 클라이언트만 위반' });
      // }
    });
    */

    return findings;
  }
};
