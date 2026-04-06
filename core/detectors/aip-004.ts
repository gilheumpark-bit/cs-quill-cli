import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: ai-pattern
 * Severity: info | Confidence: low
 */
export const aip004Detector: RuleDetector = {
  ruleId: 'AIP-004', // By-the-book 고집
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for By-the-book 고집
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'By-the-book 고집 위반' });
      // }
    });
    */

    return findings;
  }
};
