import { RuleDetector } from '../detector-registry';
import { CallExpression, SyntaxKind, type SourceFile } from 'ts-morph';

/**
 * TST-001: 빈 테스트 — assertion 없음
 * it()/test() 블록 내부에 expect/assert/should 호출이 없으면 보고.
 */
export const tst001Detector: RuleDetector = {
  ruleId: 'TST-001',
  detect(sourceFile: SourceFile) {
    const findings: Array<{ line: number; message: string }> = [];
    const assertRe = /\b(expect|assert|should|verify|check)\s*[\(.]/;

    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.CallExpression) return;
      const call = node as CallExpression;
      const callee = call.getExpression().getText();
      if (!/^(it|test)$/.test(callee)) return;

      const args = call.getArguments();
      const cb = args[1];
      if (!cb) return;
      const body = cb.getText();
      if (!assertRe.test(body)) {
        findings.push({
          line: call.getStartLineNumber(),
          message: 'it()/test() 블록에 expect/assert 호출 없음 — 빈 테스트',
        });
      }
    });
    return findings;
  },
};
