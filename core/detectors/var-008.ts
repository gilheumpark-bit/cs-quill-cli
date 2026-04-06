import { RuleDetector } from '../detector-registry';
import { VariableDeclarationKind } from 'ts-morph';
export const var008Detector: RuleDetector = {
  ruleId: 'VAR-008',
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];
    sourceFile.getVariableStatements().forEach(stmt => {
      if (stmt.getDeclarationKind() !== VariableDeclarationKind.Let) return;
      for (const d of stmt.getDeclarations()) {
        try { if (d.findReferencesAsNodes().length <= 2) findings.push({ line: d.getStartLineNumber(), message: d.getName() + ' let->const' }); } catch {}
      }
    });
    return findings;
  },
};
