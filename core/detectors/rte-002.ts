import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: runtime
 * Severity: critical | Confidence: high
 */
export const rte002Detector: RuleDetector = {
  ruleId: 'RTE-002', // undefined dereference
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for undefined dereference
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'undefined dereference 위반' });
      // }
    });
    */

    return findings;
  }
};
