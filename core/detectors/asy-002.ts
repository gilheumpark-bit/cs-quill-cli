import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: async
 */
export const asy002Detector: RuleDetector = {
  ruleId: 'ASY-002', // await in loop — 병렬 처리 가능
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.AwaitExpression) {
        const parentLoop = node.getFirstAncestorByKind(SyntaxKind.ForStatement) || 
                           node.getFirstAncestorByKind(SyntaxKind.ForInStatement) || 
                           node.getFirstAncestorByKind(SyntaxKind.ForOfStatement) || 
                           node.getFirstAncestorByKind(SyntaxKind.WhileStatement);
        if (parentLoop) {
          findings.push({ line: node.getStartLineNumber(), message: 'await in loop 위반' });
        }
      }
    });
    return findings;
  }
};
