import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: runtime
 * Severity: critical | Confidence: high
 */
export const rte001Detector: RuleDetector = {
  ruleId: 'RTE-001', // null dereference
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for null dereference
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'null dereference 위반' });
      // }
    });
    */

    return findings;
  }
};
