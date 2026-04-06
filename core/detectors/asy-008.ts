import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: async
 * Severity: low | Confidence: high
 */
export const asy008Detector: RuleDetector = {
  ruleId: 'ASY-008', // await 없는 async 함수
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for await 없는 async 함수
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'await 없는 async 함수 위반' });
      // }
    });
    */

    return findings;
  }
};
