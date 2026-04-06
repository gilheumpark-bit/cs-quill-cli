import { RuleDetector } from '../detector-registry';
export const var007Detector: RuleDetector = {
  ruleId: 'VAR-007',
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];
    sourceFile.getImportDeclarations().forEach(imp => { for (const n of imp.getNamedImports()) {
      if (n.getName().startsWith('_')) continue;
      try { if (n.getNameNode().findReferencesAsNodes().length <= 1) findings.push({ line: imp.getStartLineNumber(), message: 'unused import: ' + n.getName() }); } catch {}
    }});
    return findings;
  },
};
