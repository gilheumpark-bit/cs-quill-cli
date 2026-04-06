import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: security
 * Severity: high | Confidence: medium
 */
export const sec021Detector: RuleDetector = {
  ruleId: 'SEC-021', // localStorage 민감 데이터
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for localStorage 민감 데이터
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'localStorage 민감 데이터 위반' });
      // }
    });
    */

    return findings;
  }
};
