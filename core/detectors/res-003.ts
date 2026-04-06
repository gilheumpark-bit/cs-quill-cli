import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: resource
 * Severity: medium | Confidence: medium
 */
export const res003Detector: RuleDetector = {
  ruleId: 'RES-003', // clearTimeout/Interval 누락
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for clearTimeout/Interval 누락
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'clearTimeout/Interval 누락 위반' });
      // }
    });
    */

    return findings;
  }
};
