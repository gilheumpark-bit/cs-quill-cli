import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: async
 * Severity: high | Confidence: medium
 */
export const asy007Detector: RuleDetector = {
  ruleId: 'ASY-007', // Promise.race timeout 없음
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for Promise.race timeout 없음
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'Promise.race timeout 없음 위반' });
      // }
    });
    */

    return findings;
  }
};
