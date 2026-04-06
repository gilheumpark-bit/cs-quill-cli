import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: api-misuse
 * Severity: medium | Confidence: medium
 */
export const api013Detector: RuleDetector = {
  ruleId: 'API-013', // Object.assign mutate 혼동
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for Object.assign mutate 혼동
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'Object.assign mutate 혼동 위반' });
      // }
    });
    */

    return findings;
  }
};
