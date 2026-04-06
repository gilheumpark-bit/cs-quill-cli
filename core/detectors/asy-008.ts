import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: async
 */
export const asy008Detector: RuleDetector = {
  ruleId: 'ASY-008', // await 없는 async 함수
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    sourceFile.getFunctions().forEach(func => {
      if (func.isAsync()) {
        let hasAwait = false;
        func.forEachDescendant(node => {
          if (node.getKind() === SyntaxKind.AwaitExpression) hasAwait = true;
        });
        if (!hasAwait) {
          findings.push({ line: func.getStartLineNumber(), message: 'await 없는 async 함수' });
        }
      }
    });
    return findings;
  }
};
