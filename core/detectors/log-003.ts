import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: logic
 * Severity: low | Confidence: high
 */
export const log003Detector: RuleDetector = {
  ruleId: 'LOG-003', // boolean 리터럴 비교
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for boolean 리터럴 비교
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'boolean 리터럴 비교 위반' });
      // }
    });
    */

    return findings;
  }
};
