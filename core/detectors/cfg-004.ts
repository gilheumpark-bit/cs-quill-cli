import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * CFG-004: target: ES3
 * Detects when the TypeScript compilation target is set to the outdated ES3.
 * ES3 produces unnecessarily bloated output and lacks modern features.
 */
export const cfg004Detector: RuleDetector = {
  ruleId: 'CFG-004',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const fullText = sourceFile.getFullText();
    const filePath = sourceFile.getFilePath();

    // Check JSON tsconfig
    if (filePath.includes('tsconfig')) {
      const match = fullText.match(/"target"\s*:\s*"(ES3|es3)"/);
      if (match) {
        const line = fullText.substring(0, match.index).split('\n').length;
        findings.push({
          line,
          message: 'CFG-004: target: "ES3" — 구식 컴파일 타겟. 최소 ES2018 이상 권장',
        });
      }
      // Also flag ES5 as a warning
      const matchEs5 = fullText.match(/"target"\s*:\s*"(ES5|es5)"/);
      if (matchEs5) {
        const line = fullText.substring(0, matchEs5.index).split('\n').length;
        findings.push({
          line,
          message: 'CFG-004: target: "ES5" — 구형 타겟. 브라우저 지원 요구 사항을 확인하고 최신 타겟 검토 권장',
        });
      }
    }

    // Check in TS source (e.g., webpack/rollup config)
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.PropertyAssignment) {
        const name = node.getChildAtIndex(0)?.getText().replace(/['"]/g, '');
        const value = node.getChildAtIndex(2)?.getText().replace(/['"]/g, '');
        if (name === 'target' && (value === 'ES3' || value === 'es3')) {
          findings.push({
            line: node.getStartLineNumber(),
            message: 'CFG-004: target: ES3 — 구식 컴파일 타겟. ES2018 이상 권장',
          });
        }
      }
    });

    return findings;
  }
};
