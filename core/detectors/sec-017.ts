import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: security
 * Severity: high | Confidence: medium
 */
export const sec017Detector: RuleDetector = {
  ruleId: 'SEC-017', // 미검증 cross-origin 통신
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 미검증 cross-origin 통신
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '미검증 cross-origin 통신 위반' });
      // }
    });
    */

    return findings;
  }
};
