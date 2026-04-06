import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: test
 */
export const tst001Detector: RuleDetector = {
  ruleId: 'TST-001', // 빈 테스트 — assertion 없음
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.CallExpression) {
        const expr = (node as any).getExpression().getText();
        if (expr === 'test' || expr === 'it') {
          const args = (node as any).getArguments();
          if (args.length > 1 && (args[1].getKind() === SyntaxKind.ArrowFunction || args[1].getKind() === SyntaxKind.FunctionExpression)) {
            let hasExpect = false;
            args[1].forEachDescendant((inner: any) => {
              if (inner.getKind() === SyntaxKind.CallExpression && inner.getExpression().getText() === 'expect') {
                hasExpect = true;
              }
            });
            if (!hasExpect) {
              findings.push({ line: node.getStartLineNumber(), message: '빈 테스트 — assertion 없음 위반' });
            }
          }
        }
      }
    });
    return findings;
  }
};
