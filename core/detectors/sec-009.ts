import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: security
 * Severity: critical | Confidence: medium
 */
export const sec009Detector: RuleDetector = {
  ruleId: 'SEC-009', // 하드코딩 비밀번호/API키
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 하드코딩 비밀번호/API키
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '하드코딩 비밀번호/API키 위반' });
      // }
    });
    */

    return findings;
  }
};
