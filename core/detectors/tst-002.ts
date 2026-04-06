import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: test
 */
export const tst002Detector: RuleDetector = {
  ruleId: 'TST-002', // setTimeout 비결정적 테스트
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.CallExpression && (node as any).getExpression().getText() === 'setTimeout') {
        let isTest = false;
        let parent = node.getParent();
        while (parent) {
           if (parent.getKind() === SyntaxKind.CallExpression && ['it', 'test'].includes((parent as any).getExpression().getText())) {
             isTest = true;
             break;
           }
           parent = parent.getParent();
        }
        if (isTest) {
          findings.push({ line: node.getStartLineNumber(), message: 'setTimeout 비결정적 테스트 위반' });
        }
      }
    });
    return findings;
  }
};
