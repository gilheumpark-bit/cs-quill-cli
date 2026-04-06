import {
  BinaryExpression,
  Block,
  CallExpression,
  CaseClause,
  ElementAccessExpression,
  ForStatement,
  Node,
  PropertyAccessExpression,
  SourceFile,
  SwitchStatement,
  SyntaxKind,
  TryStatement,
  Type,
  WhileStatement,
} from 'ts-morph';

/** TypeScript optional chaining — ?. 토큰 */
export function hasQuestionDotToken(node: Node): boolean {
  const cn = node.compilerNode as { questionDotToken?: unknown };
  return !!cn?.questionDotToken;
}

/** a?.b.c 체인에서 최초 ?. 여부 */
export function expressionRootHasOptionalChain(node: Node): boolean {
  let cur: Node | undefined = node;
  for (let depth = 0; depth < 96 && cur; depth++) {
    if (hasQuestionDotToken(cur)) return true;
    const k = cur.getKind();
    if (k === SyntaxKind.PropertyAccessExpression) {
      cur = (cur as PropertyAccessExpression).getExpression();
    } else if (k === SyntaxKind.ElementAccessExpression) {
      cur = (cur as ElementAccessExpression).getExpression();
    } else if (k === SyntaxKind.CallExpression) {
      cur = (cur as CallExpression).getExpression();
    } else break;
  }
  return false;
}

export function typeHasNull(t: Type): boolean {
  try {
    if (t.isNull()) return true;
    if (t.isUnion()) return t.getUnionTypes().some((u) => u.isNull());
  } catch {
    /* checker 없음 */
  }
  return false;
}

export function typeHasUndefined(t: Type): boolean {
  try {
    if (t.isUndefined()) return true;
    if (t.isUnion()) return t.getUnionTypes().some((u) => u.isUndefined());
  } catch {
    /* ignore */
  }
  return false;
}

/** JSON.parse 등: try의 try 블록 안에만 있는지 (catch/finally 제외) */
export function isInTryBlockOnly(node: Node): boolean {
  const ts = node.getFirstAncestorByKind(SyntaxKind.TryStatement) as TryStatement | undefined;
  if (!ts) return false;
  const tb = ts.getTryBlock();
  return !!tb && node.getAncestors().includes(tb);
}

function isBooleanLikeExpr(node: Node): boolean {
  const k = node.getKind();
  if (k === SyntaxKind.TrueKeyword || k === SyntaxKind.FalseKeyword) return true;
  try {
    const t = node.getType();
    if (t.isBoolean() || t.isBooleanLiteral()) return true;
  } catch {
    /* ignore */
  }
  return false;
}

/** || 대신 ??가 더 맞을 수 있는 패턴 (좌변이 boolean이 아님) */
export function isSuspiciousBarBar(be: BinaryExpression): boolean {
  if (be.getOperatorToken().getKind() !== SyntaxKind.BarBarToken) return false;
  return !isBooleanLikeExpr(be.getLeft());
}

/** 무한 루프: while(true) / for(;;) 본문에 break/return/throw 없음 */
export function loopBodyLacksExit(body: Block | undefined): boolean {
  if (!body) return false;
  let hasExit = false;
  body.forEachDescendant((n) => {
    if (hasExit) return;
    const k = n.getKind();
    if (k === SyntaxKind.BreakStatement || k === SyntaxKind.ReturnStatement || k === SyntaxKind.ThrowStatement) {
      hasExit = true;
    }
  });
  return !hasExit;
}

export function isWhileTrueOrForEver(node: Node): boolean {
  if (node.getKind() === SyntaxKind.WhileStatement) {
    const w = node as WhileStatement;
    const cond = w.getExpression().getText().trim();
    if (cond === 'true') return true;
  }
  if (node.getKind() === SyntaxKind.ForStatement) {
    const f = node as ForStatement;
    if (!f.getInitializer() && !f.getCondition() && !f.getIncrementor()) return true;
  }
  return false;
}

/** case fall-through: break/return/throw 없이 다음 case로 이어짐 */
export function findSwitchFallThroughs(sw: SwitchStatement): number[] {
  const lines: number[] = [];
  const clauses = sw.getCaseBlock().getClauses();
  for (let i = 0; i < clauses.length - 1; i++) {
    const cur = clauses[i];
    if (cur.getKind() === SyntaxKind.DefaultClause) continue;
    const cc = cur as CaseClause;
    const stmts = cc.getStatements();
    if (stmts.length === 0) {
      lines.push(cc.getStartLineNumber());
      continue;
    }
    const last = stmts[stmts.length - 1];
    const k = last.getKind();
    if (k === SyntaxKind.BreakStatement || k === SyntaxKind.ReturnStatement || k === SyntaxKind.ThrowStatement) {
      continue;
    }
    if (k === SyntaxKind.Block) {
      const inner = (last as Block).getStatements().slice(-1)[0];
      if (
        inner &&
        (inner.getKind() === SyntaxKind.BreakStatement ||
          inner.getKind() === SyntaxKind.ReturnStatement ||
          inner.getKind() === SyntaxKind.ThrowStatement)
      ) {
        continue;
      }
    }
    lines.push(cc.getStartLineNumber());
  }
  return lines;
}

/** return/throw 이후 동일 블록 내 문장 */
export function findUnreachableInBlocks(sf: SourceFile): Array<{ line: number; reason: string }> {
  const out: Array<{ line: number; reason: string }> = [];
  sf.forEachDescendant((node) => {
    if (node.getKind() !== SyntaxKind.Block) return;
    const block = node as Block;
    const stmts = block.getStatements();
    let terminalHit = false;
    for (const st of stmts) {
      if (terminalHit) {
        out.push({
          line: st.getStartLineNumber(),
          reason: 'return/throw/break/continue 이후 도달 불가 코드',
        });
        continue;
      }
      const k = st.getKind();
      if (k === SyntaxKind.ReturnStatement || k === SyntaxKind.ThrowStatement) terminalHit = true;
      if (k === SyntaxKind.ContinueStatement || k === SyntaxKind.BreakStatement) terminalHit = true;
    }
  });
  return out;
}

/** 항상 같은 결과인 if 조건 (리터럴) */
export function isDeadBranchCondition(expr: Node): 'always-false' | 'always-true' | null {
  const k = expr.getKind();
  if (k === SyntaxKind.FalseKeyword) return 'always-false';
  if (k === SyntaxKind.TrueKeyword) return 'always-true';
  if (k === SyntaxKind.NullKeyword) return 'always-false';
  if (k === SyntaxKind.NumericLiteral) {
    const v = (expr as any).getLiteralValue?.() ?? Number(expr.getText());
    if (v === 0) return 'always-false';
    if (Number.isFinite(v) && v !== 0) return 'always-true';
  }
  if (k === SyntaxKind.StringLiteral) {
    const v = (expr as import('ts-morph').StringLiteral).getLiteralValue();
    if (v === '') return 'always-false';
    return 'always-true';
  }
  if (k === SyntaxKind.Identifier && expr.getText() === 'undefined') return 'always-false';
  return null;
}

export function isJsonParseCall(node: Node): node is CallExpression {
  if (node.getKind() !== SyntaxKind.CallExpression) return false;
  const c = node as CallExpression;
  const ex = c.getExpression();
  if (ex.getKind() === SyntaxKind.PropertyAccessExpression) {
    const p = ex as PropertyAccessExpression;
    const base = p.getExpression().getText();
    const name = p.getName();
    return base === 'JSON' && name === 'parse';
  }
  return false;
}

export function isParseIntCall(node: Node): node is CallExpression {
  if (node.getKind() !== SyntaxKind.CallExpression) return false;
  const c = node as CallExpression;
  const ex = c.getExpression();
  return ex.getKind() === SyntaxKind.Identifier && (ex as any).getText() === 'parseInt';
}

/** arr[arr.length] 형태 (대개 off-by-one / undefined) */
export function isArrayLengthAsIndex(ea: ElementAccessExpression): boolean {
  const arg = ea.getArgumentExpression();
  if (!arg || arg.getKind() !== SyntaxKind.PropertyAccessExpression) return false;
  const inner = arg as PropertyAccessExpression;
  if (inner.getName() !== 'length') return false;
  const arr = ea.getExpression().getText();
  const lenObj = inner.getExpression().getText();
  return arr === lenObj;
}
