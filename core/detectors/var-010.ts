import { RuleDetector } from '../detector-registry';
export const var010Detector: RuleDetector = {
  ruleId: 'VAR-010',
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];
    const seen = new Map<string, number>();
    sourceFile.getVariableDeclarations().forEach(d => {
      const n = d.getName(), l = d.getStartLineNumber();
      if (seen.has(n)) findings.push({ line: l, message: n + ' duplicate declaration' });
      else seen.set(n, l);
    });
    return findings;
  },
};
