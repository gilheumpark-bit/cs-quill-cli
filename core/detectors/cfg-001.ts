import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * CFG-001: strict: false
 * Detects tsconfig.json-like files or code that sets compilerOptions.strict to false.
 * Also detects configuration objects where strict mode is explicitly disabled.
 */
export const cfg001Detector: RuleDetector = {
  ruleId: 'CFG-001',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const filePath = sourceFile.getFilePath();
    const fullText = sourceFile.getFullText();

    // For JSON-like TS files or config files
    if (filePath.includes('tsconfig') || filePath.endsWith('.json.ts')) {
      const strictFalseMatch = fullText.match(/"strict"\s*:\s*false/);
      if (strictFalseMatch) {
        const line = fullText.substring(0, strictFalseMatch.index).split('\n').length;
        findings.push({
          line,
          message: 'CFG-001: "strict": false — TypeScript strict 모드를 활성화하세요',
        });
      }
    }

    // Detect in TS source code: compilerOptions.strict = false or { strict: false }
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.PropertyAssignment) {
        const name = node.getChildAtIndex(0)?.getText();
        const value = node.getChildAtIndex(2)?.getText();
        if (name && (name === 'strict' || name === '"strict"' || name === "'strict'") && value === 'false') {
          findings.push({
            line: node.getStartLineNumber(),
            message: 'CFG-001: strict: false 설정 감지 — strict 모드를 true로 변경 권장',
          });
        }
      }
    });

    return findings;
  }
};
