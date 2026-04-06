import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: async
 */
export const asy013Detector: RuleDetector = {
  ruleId: 'ASY-013', // Promise 생성자 async 콜백
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.NewExpression && (node as any).getExpression().getText() === 'Promise') {
        const args = (node as any).getArguments();
        if (args.length > 0 && (args[0].getKind() === SyntaxKind.ArrowFunction || args[0].getKind() === SyntaxKind.FunctionExpression)) {
          if ((args[0] as any).hasModifier(SyntaxKind.AsyncKeyword)) {
            findings.push({ line: node.getStartLineNumber(), message: 'Promise 생성자에 async 콜백 금지' });
          }
        }
      }
    });
    return findings;
  }
};
