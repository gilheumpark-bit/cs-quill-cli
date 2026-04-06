import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: logic
 * Severity: high | Confidence: high
 */
export const log005Detector: RuleDetector = {
  ruleId: 'LOG-005', // NaN 직접 비교
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for NaN 직접 비교
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'NaN 직접 비교 위반' });
      // }
    });
    */

    return findings;
  }
};
