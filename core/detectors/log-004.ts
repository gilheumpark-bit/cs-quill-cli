import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: logic
 * Severity: low | Confidence: high
 */
export const log004Detector: RuleDetector = {
  ruleId: 'LOG-004', // !! 불필요 사용
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for !! 불필요 사용
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '!! 불필요 사용 위반' });
      // }
    });
    */

    return findings;
  }
};
