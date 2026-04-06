import { RuleDetector } from '../detector-registry';
import { SyntaxKind, CallExpression, ArrayLiteralExpression } from 'ts-morph';

const TIMEOUT_HINT = /setTimeout|setInterval|AbortSignal|timeout|delay|sleep|deadline|after\(/i;

/**
 * Phase / Rule Category: async
 * Promise.race 인자에 타임아웃/취소 신호가 없는지 (휴리스틱)
 */
export const asy007Detector: RuleDetector = {
  ruleId: 'ASY-007', // Promise.race timeout 없음
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];

    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.CallExpression) return;
      const call = node as CallExpression;
      const callee = call.getExpression();
      if (callee.getText() !== 'Promise.race') return;
      const args = call.getArguments();
      if (args.length === 0) return;
      const first = args[0];
      if (first.getKind() !== SyntaxKind.ArrayLiteralExpression) return;
      const elements = (first as ArrayLiteralExpression).getElements();
      if (elements.length === 0) return;
      const joined = elements.map((e) => e.getText()).join('\n');
      if (!TIMEOUT_HINT.test(joined)) {
        findings.push({
          line: call.getStartLineNumber(),
          message:
            'Promise.race에 타임아웃·지연·AbortSignal 후보가 보이지 않습니다 (ASY-007). 무한 대기 가능성을 검토하세요.',
        });
      }
    });

    return findings;
  },
};
