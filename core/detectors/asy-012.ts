import { RuleDetector } from '../detector-registry';
import { SyntaxKind, CallExpression, ArrowFunction, FunctionExpression, Block } from 'ts-morph';

/**
 * Phase / Rule Category: async
 */
export const asy012Detector: RuleDetector = {
  ruleId: 'ASY-012', // setTimeout 내 throw
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];

    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.CallExpression) return;
      const call = node as CallExpression;
      const callee = call.getExpression();
      const calleeText = callee.getText();
      if (calleeText !== 'setTimeout' && calleeText !== 'setInterval') return;
      const args = call.getArguments();
      if (args.length === 0) return;
      const cb = args[0];
      if (cb.getKind() !== SyntaxKind.ArrowFunction && cb.getKind() !== SyntaxKind.FunctionExpression) return;
      const body = (cb as ArrowFunction | FunctionExpression).getBody();
      if (body.getKind() !== SyntaxKind.Block) return;
      (body as Block).forEachDescendant((inner) => {
        if (inner.getKind() === SyntaxKind.ThrowStatement) {
          findings.push({
            line: inner.getStartLineNumber(),
            message: 'setTimeout/setInterval 콜백에서 throw하면 호출자 try/catch로 잡히지 않을 수 있습니다 (ASY-012).',
          });
        }
      });
    });

    return findings;
  },
};
