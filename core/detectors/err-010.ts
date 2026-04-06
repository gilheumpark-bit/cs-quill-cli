import { RuleDetector } from '../detector-registry';
import { CallExpression, SyntaxKind, TryStatement } from 'ts-morph';
import { isUnawaitedPromiseCall } from './err-helpers';

/**
 * try 안에서 await 없이 fetch / dynamic import 호출
 */
export const err010Detector: RuleDetector = {
  ruleId: 'ERR-010', // 비동기 에러를 동기 catch
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];

    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.TryStatement) return;
      const ts = node as TryStatement;
      const tryBlock = ts.getTryBlock();
      tryBlock.forEachDescendant((n) => {
        if (n.getKind() !== SyntaxKind.CallExpression) return;
        const call = n as CallExpression;
        if (!isUnawaitedPromiseCall(call)) return;
        findings.push({
          line: call.getStartLineNumber(),
          message:
            'try 내에서 await 없이 fetch/import 등이 호출되었습니다. 동기 catch는 이 비동기 실패를 잡지 못할 수 있습니다 (ERR-010).',
        });
      });
    });

    return findings;
  },
};
