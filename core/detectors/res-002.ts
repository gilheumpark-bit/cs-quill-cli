import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

const POOL_METHODS = ['getConnection', 'connect', 'pool.query', 'createConnection', 'createPool'];

export const res002Detector: RuleDetector = {
  ruleId: 'RES-002',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const fullText = sourceFile.getFullText();

    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.CallExpression) {
        const text = node.getText();
        if (text.includes('getConnection') || text.includes('createConnection')) {
          const hasRelease = fullText.includes('.release(') || fullText.includes('.end(') ||
                             fullText.includes('.close(') || fullText.includes('.destroy(');
          if (!hasRelease) {
            findings.push({
              line: node.getStartLineNumber(),
              message: 'DB 커넥션을 획득하지만 release/close 호출이 보이지 않습니다. 커넥션 풀 고갈 위험이 있습니다.',
            });
          }
        }
      }
    });

    return findings;
  }
};
