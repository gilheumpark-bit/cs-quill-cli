import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: async
 * Severity: high | Confidence: medium
 */
export const asy012Detector: RuleDetector = {
  ruleId: 'ASY-012', // setTimeout 내 throw
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for setTimeout 내 throw
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'setTimeout 내 throw 위반' });
      // }
    });
    */

    return findings;
  }
};
