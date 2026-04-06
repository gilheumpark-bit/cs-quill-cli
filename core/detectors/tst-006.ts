import { RuleDetector } from '../detector-registry';
import { CallExpression, SyntaxKind, type SourceFile } from 'ts-morph';

/**
 * TST-006: 단일 테스트 복수 단위 테스트
 * 하나의 it()/test() 내에 expect 호출이 5개 이상이면
 * 여러 관심사를 한 테스트에서 검증하는 것으로 의심.
 */
const EXPECT_THRESHOLD = 5;

export const tst006Detector: RuleDetector = {
  ruleId: 'TST-006',
  detect(sourceFile: SourceFile) {
    const findings: Array<{ line: number; message: string }> = [];

    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.CallExpression) return;
      const call = node as CallExpression;
      const callee = call.getExpression().getText();
      if (!/^(it|test)$/.test(callee)) return;

      const cb = call.getArguments()[1];
      if (!cb) return;

      let expectCount = 0;
      cb.forEachDescendant((inner) => {
        if (inner.getKind() !== SyntaxKind.CallExpression) return;
        const ic = inner as CallExpression;
        if (ic.getExpression().getText() === 'expect') expectCount++;
      });

      if (expectCount >= EXPECT_THRESHOLD) {
        findings.push({
          line: call.getStartLineNumber(),
          message: `단일 테스트에 expect ${expectCount}회 — 복수 관심사 검증 의심`,
        });
      }
    });
    return findings;
  },
};
