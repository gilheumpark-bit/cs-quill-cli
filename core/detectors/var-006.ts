import { RuleDetector } from '../detector-registry';
export const var006Detector: RuleDetector = {
  ruleId: 'VAR-006',
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];
    sourceFile.getFunctions().forEach(fn => { fn.getParameters().forEach(p => {
      if (p.getName().startsWith('_')) return;
      try { if (p.findReferencesAsNodes().length <= 1) findings.push({ line: p.getStartLineNumber(), message: 'unused param: ' + p.getName() }); } catch {}
    }); });
    return findings;
  },
};
