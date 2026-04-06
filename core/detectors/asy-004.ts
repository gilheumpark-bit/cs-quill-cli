import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: async
 * Severity: medium | Confidence: medium
 */
export const asy004Detector: RuleDetector = {
  ruleId: 'ASY-004', // async 함수 명시적 return 누락
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for async 함수 명시적 return 누락
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'async 함수 명시적 return 누락 위반' });
      // }
    });
    */

    return findings;
  }
};
