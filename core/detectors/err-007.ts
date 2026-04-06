import { RuleDetector } from '../detector-registry';
import { SyntaxKind, TryStatement } from 'ts-morph';
import { tryNestingDepth } from './err-helpers';

/** 조상 try 포함 깊이 3 이상 */
export const err007Detector: RuleDetector = {
  ruleId: 'ERR-007', // 중첩 try-catch 3단+
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];

    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.TryStatement) return;
      const ts = node as TryStatement;
      if (tryNestingDepth(ts) < 3) return;
      findings.push({
        line: ts.getStartLineNumber(),
        message: 'try-catch가 3단 이상 중첩되었습니다. 구조 단순화를 검토하세요 (ERR-007).',
      });
    });

    return findings;
  },
};
