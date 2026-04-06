import { RuleDetector } from '../detector-registry';
import { SyntaxKind, Block, IfStatement, ReturnStatement, Statement, ArrowFunction, MethodDeclaration } from 'ts-morph';

function branchReturnsWithValue(stmt: Statement): boolean {
  if (stmt.getKind() === SyntaxKind.Block) {
    const block = stmt as Block;
    const stmts = block.getStatements();
    if (stmts.length === 0) return false;
    const last = stmts[stmts.length - 1];
    if (last.getKind() !== SyntaxKind.ReturnStatement) return false;
    return !!(last as ReturnStatement).getExpression();
  }
  if (stmt.getKind() === SyntaxKind.ReturnStatement) {
    return !!(stmt as ReturnStatement).getExpression();
  }
  return false;
}

function scanBlockForIfFallthrough(block: Block, findings: Array<{ line: number; message: string }>) {
  const stmts = block.getStatements();
  for (let i = 0; i < stmts.length; i++) {
    const stmt = stmts[i];
    if (stmt.getKind() !== SyntaxKind.IfStatement) continue;
    const ifs = stmt as IfStatement;
    if (ifs.getElseStatement()) continue;
    if (!branchReturnsWithValue(ifs.getThenStatement())) continue;
    if (i < stmts.length - 1) {
      findings.push({
        line: ifs.getStartLineNumber(),
        message:
          'async 함수에서 if 분기만 값을 반환하고 이후 코드가 실행될 수 있습니다 (ASY-004). else 또는 통합 return을 검토하세요.',
      });
    }
  }
}

function checkAsyncLike(body: Block | undefined, findings: Array<{ line: number; message: string }>) {
  if (!body) return;
  scanBlockForIfFallthrough(body, findings);
}

/**
 * Phase / Rule Category: async
 * async 함수에서 if(조건) return 값; 만 있고 else 없이 뒤에 문이 이어지는 패턴 (경로별 반환 누락 가능)
 */
export const asy004Detector: RuleDetector = {
  ruleId: 'ASY-004', // async 함수 명시적 return 누락
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];

    sourceFile.getFunctions().forEach((func) => {
      if (!func.isAsync()) return;
      checkAsyncLike(func.getBody() as Block | undefined, findings);
    });

    sourceFile.getClasses().forEach((c) => {
      c.getMethods().forEach((m: MethodDeclaration) => {
        if (!m.hasModifier(SyntaxKind.AsyncKeyword)) return;
        checkAsyncLike(m.getBody() as Block | undefined, findings);
      });
    });

    sourceFile.getVariableDeclarations().forEach((vd) => {
      const init = vd.getInitializer();
      if (!init || init.getKind() !== SyntaxKind.ArrowFunction) return;
      const fn = init as ArrowFunction;
      if (!fn.hasModifier(SyntaxKind.AsyncKeyword)) return;
      const b = fn.getBody();
      if (b.getKind() === SyntaxKind.Block) {
        scanBlockForIfFallthrough(b as Block, findings);
      }
    });

    return findings;
  },
};
