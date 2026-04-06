import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: resource
 * Severity: medium | Confidence: medium
 */
export const res004Detector: RuleDetector = {
  ruleId: 'RES-004', // AbortController 없이 fetch
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for AbortController 없이 fetch
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'AbortController 없이 fetch 위반' });
      // }
    });
    */

    return findings;
  }
};
