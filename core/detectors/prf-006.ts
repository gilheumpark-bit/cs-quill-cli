import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

export const prf006Detector: RuleDetector = {
  ruleId: 'PRF-006',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const fullText = sourceFile.getFullText();
    const addCount = (fullText.match(/addEventListener/g) || []).length;
    const removeCount = (fullText.match(/removeEventListener/g) || []).length;

    if (addCount > 0 && removeCount === 0) {
      // Report each addEventListener call
      sourceFile.forEachDescendant(node => {
        if (node.getKind() === SyntaxKind.CallExpression) {
          const text = node.getText();
          if (text.includes('addEventListener')) {
            findings.push({
              line: node.getStartLineNumber(),
              message: 'addEventListener가 있지만 대응하는 removeEventListener가 파일 내에 없습니다. 이벤트 리스너 누적(leak) 가능성이 있습니다.',
            });
          }
        }
      });
    }

    return findings;
  }
};
