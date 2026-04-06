import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

export const res003Detector: RuleDetector = {
  ruleId: 'RES-003',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const fullText = sourceFile.getFullText();
    const hasClearInterval = fullText.includes('clearInterval');
    const hasClearTimeout = fullText.includes('clearTimeout');

    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.CallExpression) {
        const text = node.getText();

        if (/^setInterval\s*\(/.test(text) || /\.\s*setInterval\s*\(/.test(text) ||
            /window\s*\.\s*setInterval\s*\(/.test(text)) {
          if (!hasClearInterval) {
            findings.push({
              line: node.getStartLineNumber(),
              message: 'setInterval이 있지만 clearInterval 호출이 보이지 않습니다. 타이머 누수가 발생할 수 있습니다.',
            });
          }
        }

        if (/^setTimeout\s*\(/.test(text) || /window\s*\.\s*setTimeout\s*\(/.test(text)) {
          // setTimeout is less critical, but if used in a component lifecycle without clear, flag it
          if (!hasClearTimeout && fullText.includes('useEffect')) {
            findings.push({
              line: node.getStartLineNumber(),
              message: 'useEffect 내 setTimeout에 대응하는 clearTimeout이 보이지 않습니다. cleanup 함수에서 정리하세요.',
            });
          }
        }
      }
    });

    return findings;
  }
};
