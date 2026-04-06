import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: security
 * Severity: critical | Confidence: low
 */
export const sec025Detector: RuleDetector = {
  ruleId: 'SEC-025', // 인증 없는 API 엔드포인트
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 인증 없는 API 엔드포인트
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '인증 없는 API 엔드포인트 위반' });
      // }
    });
    */

    return findings;
  }
};
