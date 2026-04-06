import { RuleDetector } from '../detector-registry';
export const var005Detector: RuleDetector = {
  ruleId: 'VAR-005',
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];
    sourceFile.getVariableDeclarations().forEach(d => {
      if (d.getName().startsWith('_')) return;
      try { if (d.findReferencesAsNodes().length <= 1) findings.push({ line: d.getStartLineNumber(), message: 'unused var: ' + d.getName() }); } catch {}
    });
    return findings;
  },
};
