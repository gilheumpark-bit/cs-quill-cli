import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: runtime
 * Severity: high | Confidence: medium
 */
export const rte009Detector: RuleDetector = {
  ruleId: 'RTE-009', // parseInt NaN 미처리
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for parseInt NaN 미처리
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'parseInt NaN 미처리 위반' });
      // }
    });
    */

    return findings;
  }
};
