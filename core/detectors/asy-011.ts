import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: async
 * Severity: high | Confidence: medium
 */
export const asy011Detector: RuleDetector = {
  ruleId: 'ASY-011', // 동기 heavy computation — event loop 블로킹
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 동기 heavy computation — event loop 블로킹
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '동기 heavy computation — event loop 블로킹 위반' });
      // }
    });
    */

    return findings;
  }
};
