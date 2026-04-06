import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: security
 * Severity: high | Confidence: low
 */
export const sec018Detector: RuleDetector = {
  ruleId: 'SEC-018', // 민감 데이터 로그 출력
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 민감 데이터 로그 출력
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '민감 데이터 로그 출력 위반' });
      // }
    });
    */

    return findings;
  }
};
