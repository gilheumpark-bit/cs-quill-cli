import { RuleDetector } from '../detector-registry';
export const var003Detector: RuleDetector = {
  ruleId: 'VAR-003',
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];
    sourceFile.getStatements().forEach(stmt => {
      const text = stmt.getText().trim();
      if (/^[a-zA-Z_$]\w*\s*=\s*/.test(text) && !/^(const|let|var|export|import|function|class|type|interface)/.test(text)) {
        findings.push({ line: stmt.getStartLineNumber(), message: 'implicit global: ' + text.slice(0, 30) });
      }
    });
    return findings;
  },
};
