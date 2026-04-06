import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: runtime
 * Severity: high | Confidence: medium
 */
export const rte005Detector: RuleDetector = {
  ruleId: 'RTE-005', // Array 길이 확인 없음
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for Array 길이 확인 없음
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'Array 길이 확인 없음 위반' });
      // }
    });
    */

    return findings;
  }
};
