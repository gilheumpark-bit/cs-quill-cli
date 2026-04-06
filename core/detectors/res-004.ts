import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

export const res004Detector: RuleDetector = {
  ruleId: 'RES-004',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const fullText = sourceFile.getFullText();
    const hasAbortController = fullText.includes('AbortController') || fullText.includes('signal');

    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.CallExpression) {
        const text = node.getText();
        // Match fetch() calls
        if (/^fetch\s*\(/.test(text) || /\bfetch\s*\(/.test(text)) {
          if (!hasAbortController && !text.includes('signal')) {
            findings.push({
              line: node.getStartLineNumber(),
              message: 'fetch() 호출에 AbortController/signal이 없습니다. 요청 취소가 불가능하여 메모리 누수 가능성이 있습니다.',
            });
          }
        }
      }
    });

    return findings;
  }
};
