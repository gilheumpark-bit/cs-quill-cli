import { RuleDetector } from '../detector-registry';
export const var012Detector: RuleDetector = {
  ruleId: 'VAR-012',
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];
    sourceFile.getFunctions().forEach(fn => {
      const n = fn.getName(); if (!n || n.startsWith('_') || fn.isExported()) return;
      try { if (fn.findReferencesAsNodes().length <= 1) findings.push({ line: fn.getStartLineNumber(), message: 'dead function: ' + n }); } catch {}
    });
    sourceFile.getVariableDeclarations().forEach(d => {
      const n = d.getName(); if (n.startsWith('_') || d.getVariableStatement()?.isExported()) return;
      try { if (d.findReferencesAsNodes().length <= 1) findings.push({ line: d.getStartLineNumber(), message: 'dead var: ' + n }); } catch {}
    });
    return findings;
  },
};
