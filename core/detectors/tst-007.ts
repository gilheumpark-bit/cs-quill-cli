import { RuleDetector } from '../detector-registry';
import { SyntaxKind, VariableDeclarationKind, type SourceFile } from 'ts-morph';

/**
 * TST-007: shared state 오염
 * 테스트 파일의 모듈 최상위에 let/var 변수를 선언하면서
 * beforeEach/afterEach 초기화가 없으면 테스트 간 상태 오염 의심.
 */
export const tst007Detector: RuleDetector = {
  ruleId: 'TST-007',
  detect(sourceFile: SourceFile) {
    const findings: Array<{ line: number; message: string }> = [];
    const isTest = /\.(test|spec)\.(ts|js|tsx|jsx)$/.test(sourceFile.getFilePath());
    if (!isTest) return findings;

    const full = sourceFile.getFullText();
    const hasReset = /beforeEach|afterEach/.test(full);
    if (hasReset) return findings;

    for (const stmt of sourceFile.getVariableStatements()) {
      // Only top-level statements (parent is SourceFile)
      if (stmt.getParent()?.getKind() !== SyntaxKind.SourceFile) continue;
      const kind = stmt.getDeclarationKind();
      if (kind === VariableDeclarationKind.Const) continue;
      for (const decl of stmt.getDeclarations()) {
        findings.push({
          line: stmt.getStartLineNumber(),
          message: `모듈 최상위 ${kind} "${decl.getName()}" — beforeEach 초기화 없이 공유 상태 오염 의심`,
        });
      }
    }
    return findings;
  },
};
