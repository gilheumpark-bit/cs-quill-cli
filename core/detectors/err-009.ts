import { RuleDetector } from '../detector-registry';
import { PropertyAccessExpression, SyntaxKind } from 'ts-morph';
import { isUserFacingStackLeak } from './err-helpers';

/**
 * .stack을 응답/클라이언트 경로로 넘기는 경우만 (console 제외)
 */
export const err009Detector: RuleDetector = {
  ruleId: 'ERR-009', // stack trace 사용자 노출
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];

    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.PropertyAccessExpression) return;
      const pa = node as PropertyAccessExpression;
      if (!isUserFacingStackLeak(pa)) return;
      findings.push({
        line: pa.getStartLineNumber(),
        message: 'stack이 응답/전송 경로로 전달될 수 있습니다. 프로덕션에서는 숨기거나 로그만 남기세요 (ERR-009).',
      });
    });

    return findings;
  },
};
