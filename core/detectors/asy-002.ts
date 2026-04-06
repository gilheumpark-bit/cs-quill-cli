import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: async
 * Severity: high | Confidence: high
 */
export const asy002Detector: RuleDetector = {
  ruleId: 'ASY-002', // await in loop — 병렬 처리 가능
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for await in loop — 병렬 처리 가능
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'await in loop — 병렬 처리 가능 위반' });
      // }
    });
    */

    return findings;
  }
};
