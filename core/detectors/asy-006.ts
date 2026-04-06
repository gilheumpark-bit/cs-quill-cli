import { RuleDetector } from '../detector-registry';
import { SyntaxKind, ExpressionStatement, Block, Statement } from 'ts-morph';

function stmtIsBareAwait(stmt: Statement): boolean {
  if (stmt.getKind() !== SyntaxKind.ExpressionStatement) return false;
  const ex = (stmt as ExpressionStatement).getExpression();
  return ex.getKind() === SyntaxKind.AwaitExpression;
}

function scanBlockSequentialAwaits(block: Block, findings: Array<{ line: number; message: string }>) {
  const stmts = block.getStatements();
  /** 스펙: 독립적인 await 3개+ 연속 시 병렬화 후보 */
  for (let i = 0; i < stmts.length - 2; i++) {
    if (
      stmtIsBareAwait(stmts[i]) &&
      stmtIsBareAwait(stmts[i + 1]) &&
      stmtIsBareAwait(stmts[i + 2])
    ) {
      findings.push({
        line: stmts[i + 2].getStartLineNumber(),
        message:
          '연속 await 3회 이상 (ASY-006). 서로 독립이면 Promise.all 병렬화를 검토하세요.',
      });
    }
  }
}

/**
 * Phase / Rule Category: async
 * 동일 블록에서 연속 await (병렬화 후보)
 */
export const asy006Detector: RuleDetector = {
  ruleId: 'ASY-006', // Promise.all vs 순차 await 오류
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];

    sourceFile.forEachDescendant((node) => {
      if (node.getKind() === SyntaxKind.Block) {
        scanBlockSequentialAwaits(node as Block, findings);
      }
    });

    return findings;
  },
};
