import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: style
 * Severity: info | Confidence: low
 */
export const stl003Detector: RuleDetector = {
  ruleId: 'STL-003', // boolean is/has/can 없음
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for boolean is/has/can 없음
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'boolean is/has/can 없음 위반' });
      // }
    });
    */

    return findings;
  }
};
