import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * CFG-002: noUnusedLocals: false
 * Detects tsconfig settings where noUnusedLocals is explicitly set to false,
 * allowing unused local variables to pass compilation.
 */
export const cfg002Detector: RuleDetector = {
  ruleId: 'CFG-002',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const fullText = sourceFile.getFullText();
    const filePath = sourceFile.getFilePath();

    // JSON content check
    if (filePath.includes('tsconfig')) {
      const match = fullText.match(/"noUnusedLocals"\s*:\s*false/);
      if (match) {
        const line = fullText.substring(0, match.index).split('\n').length;
        findings.push({
          line,
          message: 'CFG-002: "noUnusedLocals": false — 미사용 변수 검출을 위해 true로 설정 권장',
        });
      }
    }

    // Object literal in TS source
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.PropertyAssignment) {
        const name = node.getChildAtIndex(0)?.getText().replace(/['"]/g, '');
        const value = node.getChildAtIndex(2)?.getText();
        if (name === 'noUnusedLocals' && value === 'false') {
          findings.push({
            line: node.getStartLineNumber(),
            message: 'CFG-002: noUnusedLocals: false — 미사용 로컬 변수 탐지를 위해 true 권장',
          });
        }
      }
    });

    return findings;
  }
};
