import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: style
 * Severity: low | Confidence: high
 */
export const stl010Detector: RuleDetector = {
  ruleId: 'STL-010', // TODO/FIXME/HACK 잔류
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for TODO/FIXME/HACK 잔류
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'TODO/FIXME/HACK 잔류 위반' });
      // }
    });
    */

    return findings;
  }
};
