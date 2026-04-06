import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: type
 * Severity: high | Confidence: medium
 */
export const typ004Detector: RuleDetector = {
  ruleId: 'TYP-004', // ! non-null assertion 과용
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for ! non-null assertion 과용
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '! non-null assertion 과용 위반' });
      // }
    });
    */

    return findings;
  }
};
