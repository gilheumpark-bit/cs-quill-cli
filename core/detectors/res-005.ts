import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

export const res005Detector: RuleDetector = {
  ruleId: 'RES-005',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const fullText = sourceFile.getFullText();

    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.NewExpression) {
        const text = node.getText();
        if (text.includes('Worker')) {
          const hasTerminate = fullText.includes('.terminate(');
          const hasClose = fullText.includes('worker.close') || fullText.includes('.close()');
          if (!hasTerminate && !hasClose) {
            findings.push({
              line: node.getStartLineNumber(),
              message: 'Worker를 생성하지만 terminate() 호출이 보이지 않습니다. Worker 스레드 누수 가능성이 있습니다.',
            });
          }
        }
      }
    });

    return findings;
  }
};
