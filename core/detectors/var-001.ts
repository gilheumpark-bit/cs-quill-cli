import { RuleDetector } from '../detector-registry';
import { SyntaxKind, VariableDeclarationKind } from 'ts-morph';

/**
 * VAR-001: let/const TDZ 위반 — 선언 전 사용
 * Severity: critical | Confidence: high | Engine: symbol
 */
export const var001Detector: RuleDetector = {
  ruleId: 'VAR-001',
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];

    // let/const 선언을 수집하고, 같은 스코프에서 선언 이전 사용을 탐지
    sourceFile.getVariableStatements().forEach(stmt => {
      const kind = stmt.getDeclarationKind();
      if (kind === VariableDeclarationKind.Var) return; // var는 호이스팅 — TDZ 해당 없음

      for (const decl of stmt.getDeclarations()) {
        const name = decl.getName();
        const declLine = decl.getStartLineNumber();

        // 같은 파일에서 이 변수를 참조하는 곳 찾기
        try {
          const refs = decl.findReferencesAsNodes();
          for (const ref of refs) {
            if (ref.getStartLineNumber() < declLine && ref.getSourceFile() === sourceFile) {
              findings.push({
                line: ref.getStartLineNumber(),
                message: `'${name}' — 선언(line ${declLine}) 전 사용 (TDZ 위반)`,
              });
            }
          }
        } catch { /* findReferences 실패 시 skip */ }
      }
    });

    return findings;
  },
};
