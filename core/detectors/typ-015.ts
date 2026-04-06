import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: type
 * Severity: low | Confidence: medium
 */
export const typ015Detector: RuleDetector = {
  ruleId: 'TYP-015', // optional chaining 과용
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for optional chaining 과용
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'optional chaining 과용 위반' });
      // }
    });
    */

    return findings;
  }
};
