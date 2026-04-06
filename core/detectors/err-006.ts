import { RuleDetector } from '../detector-registry';
import { SyntaxKind, TryStatement } from 'ts-morph';

/** priority-implementation-spec 3.2: try 블록 50줄+ 과도 */
const TRY_LINE_THRESHOLD = 50;

/**
 * try 블록이 과도하게 길 때만 (휴리스틱)
 */
export const err006Detector: RuleDetector = {
  ruleId: 'ERR-006', // catch 범위 과도
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];

    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.TryStatement) return;
      const ts = node as TryStatement;
      const tb = ts.getTryBlock();
      const lines = tb.getEndLineNumber() - tb.getStartLineNumber() + 1;
      if (lines <= TRY_LINE_THRESHOLD) return;
      findings.push({
        line: ts.getStartLineNumber(),
        message: `try 블록이 ${lines}줄로 과도합니다. 작은 단위로 나누거나 헬퍼로 분리하는 것을 검토하세요 (ERR-006).`,
      });
    });

    return findings;
  },
};
