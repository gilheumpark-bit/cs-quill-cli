import { RuleDetector } from '../detector-registry';
import { CallExpression, SyntaxKind, type SourceFile } from 'ts-morph';

/**
 * TST-008: happy path만 커버
 * describe 블록 내에 it()/test()가 2개 이상 있지만
 * 에러/엣지/실패 케이스를 나타내는 키워드가 전혀 없으면 보고.
 */
const errorHints = /\b(error|fail|throw|reject|invalid|null|undefined|edge|boundary|empty|negative|overflow|timeout|exception|wrong|bad|missing|없|실패|예외)\b/i;

export const tst008Detector: RuleDetector = {
  ruleId: 'TST-008',
  detect(sourceFile: SourceFile) {
    const findings: Array<{ line: number; message: string }> = [];
    const isTest = /\.(test|spec)\.(ts|js|tsx|jsx)$/.test(sourceFile.getFilePath());
    if (!isTest) return findings;

    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.CallExpression) return;
      const call = node as CallExpression;
      if (call.getExpression().getText() !== 'describe') return;
      const args = call.getArguments();
      if (args.length < 2) return;

      let testCount = 0;
      let hasErrorCase = false;

      call.forEachDescendant((inner) => {
        if (inner.getKind() !== SyntaxKind.CallExpression) return;
        const ic = inner as CallExpression;
        const name = ic.getExpression().getText();
        if (/^(it|test)$/.test(name)) {
          testCount++;
          const label = ic.getArguments()[0]?.getText() ?? '';
          if (errorHints.test(label)) hasErrorCase = true;
        }
      });

      if (testCount >= 2 && !hasErrorCase) {
        findings.push({
          line: call.getStartLineNumber(),
          message: `describe에 테스트 ${testCount}개 — 에러/엣지 케이스 없음 (happy path only 의심)`,
        });
      }
    });
    return findings;
  },
};
