import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

export const res006Detector: RuleDetector = {
  ruleId: 'RES-006',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const fullText = sourceFile.getFullText();
    const hasRemoveListener = fullText.includes('removeListener') ||
                              fullText.includes('removeAllListeners') ||
                              fullText.includes('.off(');
    const hasMaxListeners = fullText.includes('setMaxListeners');

    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.CallExpression) {
        const text = node.getText();
        // EventEmitter .on() / .addListener() pattern
        if ((/\.on\s*\(/.test(text) || /\.addListener\s*\(/.test(text)) &&
            !text.includes('once')) {
          if (!hasRemoveListener && !hasMaxListeners) {
            findings.push({
              line: node.getStartLineNumber(),
              message: 'EventEmitter에 리스너를 등록하지만 removeListener/off 호출이 보이지 않습니다. 리스너 누수(leak) 가능성이 있습니다.',
            });
          }
        }
      }
    });

    return findings;
  }
};
