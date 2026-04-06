import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: type
 * Severity: low | Confidence: medium
 */
export const typ011Detector: RuleDetector = {
  ruleId: 'TYP-011', // interface vs type alias 혼용
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for interface vs type alias 혼용
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'interface vs type alias 혼용 위반' });
      // }
    });
    */

    return findings;
  }
};
