import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: resource
 * Severity: high | Confidence: medium
 */
export const res005Detector: RuleDetector = {
  ruleId: 'RES-005', // Worker thread 종료 누락
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for Worker thread 종료 누락
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'Worker thread 종료 누락 위반' });
      // }
    });
    */

    return findings;
  }
};
