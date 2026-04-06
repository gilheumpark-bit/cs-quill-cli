import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: error-handling
 * Severity: medium | Confidence: medium
 */
export const err003Detector: RuleDetector = {
  ruleId: 'ERR-003', // catch 정보 손실
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for catch 정보 손실
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'catch 정보 손실 위반' });
      // }
    });
    */

    return findings;
  }
};
