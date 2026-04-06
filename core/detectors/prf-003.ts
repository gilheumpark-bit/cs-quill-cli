import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

export const prf003Detector: RuleDetector = {
  ruleId: 'PRF-003',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];

    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.CallExpression) {
        const text = node.getText();
        if (/JSON\s*\.\s*parse\s*\(\s*JSON\s*\.\s*stringify\s*\(/.test(text)) {
          findings.push({
            line: node.getStartLineNumber(),
            message: 'JSON.parse(JSON.stringify(...))로 깊은 복사를 수행하고 있습니다. structuredClone() 또는 전용 라이브러리를 사용하세요.',
          });
        }
      }
    });

    return findings;
  }
};
