import { RuleDetector } from '../detector-registry';
import { VariableDeclarationKind } from 'ts-morph';

/**
 * VAR-002: var 호이스팅 의존 — let/const 권장
 * Severity: medium | Confidence: high | Engine: ast
 */
export const var002Detector: RuleDetector = {
  ruleId: 'VAR-002',
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];
    sourceFile.getVariableStatements().forEach(stmt => {
      if (stmt.getDeclarationKind() === VariableDeclarationKind.Var) {
        findings.push({ line: stmt.getStartLineNumber(), message: 'var 사용 — let/const 권장' });
      }
    });
    return findings;
  },
};
