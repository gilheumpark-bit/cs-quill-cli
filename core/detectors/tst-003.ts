import { RuleDetector } from '../detector-registry';
import { CallExpression, SyntaxKind, type SourceFile } from 'ts-morph';

/**
 * TST-003: mock 미설정 외부 실제 호출
 * 테스트 파일에서 fetch/axios/http.get 등 외부 호출이 있지만
 * jest.mock/sinon.stub/nock 등 mock 설정이 없으면 보고.
 */
export const tst003Detector: RuleDetector = {
  ruleId: 'TST-003',
  detect(sourceFile: SourceFile) {
    const findings: Array<{ line: number; message: string }> = [];
    const filePath = sourceFile.getFilePath();
    const isTest = /\.(test|spec)\.(ts|js|tsx|jsx)$/.test(filePath);
    if (!isTest) return findings;

    const full = sourceFile.getFullText();
    const hasMock = /jest\.mock|sinon\.(stub|mock|fake)|nock\(|vi\.mock|spyOn|mockImplementation/.test(full);
    if (hasMock) return findings;

    const externalRe = /^(fetch|axios(\.get|\.post|\.put|\.delete)?|http\.get|https\.get|got(\.get|\.post)?)$/;

    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.CallExpression) return;
      const call = node as CallExpression;
      const name = call.getExpression().getText();
      if (externalRe.test(name)) {
        findings.push({
          line: call.getStartLineNumber(),
          message: `${name} 호출에 mock 설정 없음 — 외부 실제 호출 의심`,
        });
      }
    });
    return findings;
  },
};
