import { RuleDetector } from '../detector-registry';
import { SyntaxKind, ThrowStatement } from 'ts-morph';
import { sensitiveIdentifierInThrownExpr, sensitiveLiteralInExpression } from './err-helpers';

/**
 * 문자열/템플릿 민감 키워드 또는 throw new Error(민감 식별자)
 */
export const err008Detector: RuleDetector = {
  ruleId: 'ERR-008', // error 메시지 민감 정보
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];

    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.ThrowStatement) return;
      const ts = node as ThrowStatement;
      const expr = ts.getExpression();
      if (!sensitiveLiteralInExpression(expr) && !sensitiveIdentifierInThrownExpr(expr)) return;
      findings.push({
        line: ts.getStartLineNumber(),
        message:
          'throw 메시지에 비밀번호·토큰 등 민감 키워드가 포함된 것으로 보입니다. 사용자/로그 노출 경로를 검토하세요 (ERR-008).',
      });
    });

    return findings;
  },
};
