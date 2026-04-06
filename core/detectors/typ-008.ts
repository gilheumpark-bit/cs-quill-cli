import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: type
 * Severity: high | Confidence: high
 */
export const typ008Detector: RuleDetector = {
  ruleId: 'TYP-008', // union null|undefined 미처리
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for union null|undefined 미처리
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'union null|undefined 미처리 위반' });
      // }
    });
    */

    return findings;
  }
};
