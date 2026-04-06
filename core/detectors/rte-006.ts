import { RuleDetector } from '../detector-registry';
import { ElementAccessExpression, SyntaxKind } from 'ts-morph';
import { hasQuestionDotToken } from './rte-helpers';

/** 첫 요소 [0] — 빈 배열 시 undefined */
export const rte006Detector: RuleDetector = {
  ruleId: 'RTE-006',
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];
    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.ElementAccessExpression) return;
      const ea = node as ElementAccessExpression;
      if (hasQuestionDotToken(ea)) return;
      const base = ea.getExpression();
      if (base.getKind() === SyntaxKind.Identifier) {
        const n = base.getText();
        if (!/^(arr|list|items|rows|data|result|results|xs|ys|stack|queue)$/i.test(n)) return;
      }
      const arg = ea.getArgumentExpression();
      if (!arg) return;
      const lit =
        arg.getKind() === SyntaxKind.NumericLiteral && arg.getText().trim() === '0';
      const str0 =
        arg.getKind() === SyntaxKind.StringLiteral &&
        (arg.getText() === "'0'" || arg.getText() === '"0"');
      if (!lit && !str0) return;
      findings.push({
        line: ea.getStartLineNumber(),
        message: 'arr[0] 접근 — 빈 배열이면 undefined. length/at(0) 검토',
      });
    });
    return findings;
  },
};
