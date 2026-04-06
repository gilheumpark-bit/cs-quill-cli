import { RuleDetector } from '../detector-registry';
import { SyntaxKind, ForOfStatement } from 'ts-morph';

const ASYNC_ITER_HINT = /Async|asyncIterator|AsyncIterable|stream|readable|generator/i;

/**
 * Phase / Rule Category: async
 * for await 없이 async iterable로 보이는 표현식을 for...of로 순회
 */
export const asy014Detector: RuleDetector = {
  ruleId: 'ASY-014', // for await 없이 async iterable
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];

    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.ForOfStatement) return;
      const forOf = node as ForOfStatement;
      if (forOf.getAwaitKeyword()) return;
      const iterText = forOf.getExpression().getText();
      if (ASYNC_ITER_HINT.test(iterText)) {
        findings.push({
          line: forOf.getStartLineNumber(),
          message:
            'for...of 대상이 async iterable로 보입니다 (ASY-014). for await...of 사용 여부를 검토하세요.',
        });
      }
    });

    return findings;
  },
};
