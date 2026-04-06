import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: runtime
 * Severity: medium | Confidence: high
 */
export const rte018Detector: RuleDetector = {
  ruleId: 'RTE-018', // switch default 없음
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for switch default 없음
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'switch default 없음 위반' });
      // }
    });
    */

    return findings;
  }
};
