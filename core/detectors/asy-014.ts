import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: async
 * Severity: medium | Confidence: medium
 */
export const asy014Detector: RuleDetector = {
  ruleId: 'ASY-014', // for await 없이 async iterable
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for for await 없이 async iterable
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'for await 없이 async iterable 위반' });
      // }
    });
    */

    return findings;
  }
};
