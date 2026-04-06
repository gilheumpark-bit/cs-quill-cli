import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: security
 * Severity: critical | Confidence: high
 */
export const sec006Detector: RuleDetector = {
  ruleId: 'SEC-006', // eval() 동적 실행
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for eval() 동적 실행
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'eval() 동적 실행 위반' });
      // }
    });
    */

    return findings;
  }
};
