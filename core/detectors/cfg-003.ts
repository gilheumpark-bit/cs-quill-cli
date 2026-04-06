import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * CFG-003: skipLibCheck: true
 * Detects when skipLibCheck is set to true. While sometimes necessary for performance,
 * it disables type checking of declaration files and can hide real type errors.
 */
export const cfg003Detector: RuleDetector = {
  ruleId: 'CFG-003',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const fullText = sourceFile.getFullText();
    const filePath = sourceFile.getFilePath();

    if (filePath.includes('tsconfig')) {
      const match = fullText.match(/"skipLibCheck"\s*:\s*true/);
      if (match) {
        const line = fullText.substring(0, match.index).split('\n').length;
        findings.push({
          line,
          message: 'CFG-003: "skipLibCheck": true — 라이브러리 타입 검사를 건너뛰면 타입 오류를 놓칠 수 있음',
        });
      }
    }

    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.PropertyAssignment) {
        const name = node.getChildAtIndex(0)?.getText().replace(/['"]/g, '');
        const value = node.getChildAtIndex(2)?.getText();
        if (name === 'skipLibCheck' && value === 'true') {
          findings.push({
            line: node.getStartLineNumber(),
            message: 'CFG-003: skipLibCheck: true — 라이브러리 .d.ts 파일의 타입 검사 비활성화됨',
          });
        }
      }
    });

    return findings;
  }
};
