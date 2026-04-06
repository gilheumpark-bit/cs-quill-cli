import { RuleDetector } from '../detector-registry';
import { ForOfStatement, SyntaxKind } from 'ts-morph';

/**
 * await in loop — 병렬화(Promise.all) 검토.
 * for await...of 는 의도적 순차 비동기 이터레이션이므로 제외.
 */
export const asy002Detector: RuleDetector = {
  ruleId: 'ASY-002',
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];

    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.AwaitExpression) return;
      const parentLoop =
        node.getFirstAncestorByKind(SyntaxKind.ForStatement) ||
        node.getFirstAncestorByKind(SyntaxKind.ForInStatement) ||
        node.getFirstAncestorByKind(SyntaxKind.ForOfStatement) ||
        node.getFirstAncestorByKind(SyntaxKind.WhileStatement);
      if (!parentLoop) return;
      if (parentLoop.getKind() === SyntaxKind.ForOfStatement) {
        const fo = parentLoop as ForOfStatement;
        if (fo.getAwaitKeyword()) return;
      }
      findings.push({
        line: node.getStartLineNumber(),
        message: '루프 내 await — 독립 작업이면 Promise.all 병렬화 검토 (ASY-002)',
      });
    });
    return findings;
  },
};
