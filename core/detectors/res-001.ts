import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

const STREAM_CREATORS = ['createReadStream', 'createWriteStream', 'openSync', 'open'];

export const res001Detector: RuleDetector = {
  ruleId: 'RES-001',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const fullText = sourceFile.getFullText();

    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.CallExpression) {
        const text = node.getText();
        for (const creator of STREAM_CREATORS) {
          if (text.includes(creator)) {
            // Check if close/end/destroy is called anywhere in the file
            const hasClose = fullText.includes('.close(') || fullText.includes('.end(') ||
                             fullText.includes('.destroy(') || fullText.includes('closeSync');
            const hasPipe = fullText.includes('.pipe(');
            if (!hasClose && !hasPipe) {
              findings.push({
                line: node.getStartLineNumber(),
                message: `파일 스트림(${creator})을 열었지만 close/end/destroy 호출이 보이지 않습니다. 리소스 누수 가능성이 있습니다.`,
              });
            }
            break;
          }
        }
      }
    });

    return findings;
  }
};
