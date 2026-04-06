import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: logic
 * Severity: high | Confidence: high
 */
export const log019Detector: RuleDetector = {
  ruleId: 'LOG-019', // typeof null === object
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for typeof null === object
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'typeof null === object 위반' });
      // }
    });
    */

    return findings;
  }
};
