import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: performance
 * Severity: high | Confidence: high
 */
export const prf004Detector: RuleDetector = {
  ruleId: 'PRF-004', // await in loop → Promise.all
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for await in loop → Promise.all
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'await in loop → Promise.all 위반' });
      // }
    });
    */

    return findings;
  }
};
