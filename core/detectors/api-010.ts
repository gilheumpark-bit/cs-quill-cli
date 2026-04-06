import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: api-misuse
 * Severity: high | Confidence: high
 */
export const api010Detector: RuleDetector = {
  ruleId: 'API-010', // innerHTML 직접 할당
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for innerHTML 직접 할당
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'innerHTML 직접 할당 위반' });
      // }
    });
    */

    return findings;
  }
};
