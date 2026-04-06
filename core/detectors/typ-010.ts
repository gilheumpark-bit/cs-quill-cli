import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: type
 * Severity: medium | Confidence: high
 */
export const typ010Detector: RuleDetector = {
  ruleId: 'TYP-010', // enum non-literal 값
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for enum non-literal 값
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'enum non-literal 값 위반' });
      // }
    });
    */

    return findings;
  }
};
