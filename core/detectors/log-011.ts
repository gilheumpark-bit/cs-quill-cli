import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: logic
 * Severity: high | Confidence: high
 */
export const log011Detector: RuleDetector = {
  ruleId: 'LOG-011', // .sort() comparator 없음
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for .sort() comparator 없음
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '.sort() comparator 없음 위반' });
      // }
    });
    */

    return findings;
  }
};
