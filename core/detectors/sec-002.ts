import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: security
 * Severity: critical | Confidence: high
 */
export const sec002Detector: RuleDetector = {
  ruleId: 'SEC-002', // XSS innerHTML
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for XSS innerHTML
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'XSS innerHTML 위반' });
      // }
    });
    */

    return findings;
  }
};
