import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: error-handling
 * Severity: medium | Confidence: medium
 */
export const err006Detector: RuleDetector = {
  ruleId: 'ERR-006', // catch 범위 과도
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for catch 범위 과도
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'catch 범위 과도 위반' });
      // }
    });
    */

    return findings;
  }
};
