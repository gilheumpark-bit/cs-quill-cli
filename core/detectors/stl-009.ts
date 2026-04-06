import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

export const stl009Detector: RuleDetector = {
  ruleId: 'STL-009',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    let singleQuoteCount = 0;
    let doubleQuoteCount = 0;
    const inconsistentLines: number[] = [];

    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.StringLiteral) {
        const text = node.getText();
        if (text.startsWith("'")) {
          singleQuoteCount++;
        } else if (text.startsWith('"')) {
          doubleQuoteCount++;
        }
      }
    });

    // If both types exist, the minority style is inconsistent
    if (singleQuoteCount > 0 && doubleQuoteCount > 0) {
      const dominant = singleQuoteCount >= doubleQuoteCount ? 'single' : 'double';
      const minorityChar = dominant === 'single' ? '"' : "'";

      sourceFile.forEachDescendant(node => {
        if (node.getKind() === SyntaxKind.StringLiteral) {
          const text = node.getText();
          if (text.startsWith(minorityChar)) {
            findings.push({
              line: node.getStartLineNumber(),
              message: `따옴표 스타일이 불일치합니다. 파일의 주된 스타일은 ${dominant === 'single' ? '작은따옴표' : '큰따옴표'}인데, 반대 스타일이 사용되었습니다.`,
            });
          }
        }
      });
    }

    return findings;
  }
};
