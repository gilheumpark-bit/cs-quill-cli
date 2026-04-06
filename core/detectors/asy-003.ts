import { RuleDetector } from '../detector-registry';
import { SyntaxKind, CallExpression, ExpressionStatement, PropertyAccessExpression, Identifier } from 'ts-morph';

/**
 * 파일 내 `async function foo` / `const foo = async ()` 이름 집합 (동기 호출 여부 추정용)
 */
function collectAsyncCallableNames(sourceFile: import('ts-morph').SourceFile): Set<string> {
  const names = new Set<string>();
  for (const fn of sourceFile.getFunctions()) {
    if (fn.isAsync()) {
      const n = fn.getName();
      if (n) names.add(n);
    }
  }
  sourceFile.getVariableDeclarations().forEach((vd) => {
    const init = vd.getInitializer();
    if (!init) return;
    if (init.getKind() === SyntaxKind.ArrowFunction || init.getKind() === SyntaxKind.FunctionExpression) {
      const f = init as import('ts-morph').ArrowFunction | import('ts-morph').FunctionExpression;
      if (f.hasModifier(SyntaxKind.AsyncKeyword)) names.add(vd.getName());
    }
  });
  return names;
}

/** 표현식이 `.catch` / `.finally` 또는 `.then(a,b)` 체인으로 거부 처리되는지 (대략적) */
function callLooksPromiseHandled(call: CallExpression): boolean {
  let current: import('ts-morph').Node = call;
  for (let depth = 0; depth < 12 && current.getKind() === SyntaxKind.CallExpression; depth++) {
    const c = current as CallExpression;
    const callee = c.getExpression();
    if (callee.getKind() === SyntaxKind.PropertyAccessExpression) {
      const name = (callee as PropertyAccessExpression).getName();
      if (name === 'catch' || name === 'finally') return true;
      if (name === 'then') return true;
      current = (callee as PropertyAccessExpression).getExpression();
      continue;
    }
    break;
  }
  return false;
}

function isFloatingAsyncCall(expr: import('ts-morph').Node, asyncNames: Set<string>): boolean {
  if (expr.getKind() !== SyntaxKind.CallExpression) return false;
  const call = expr as CallExpression;
  if (callLooksPromiseHandled(call)) return false;
  const callee = call.getExpression();
  if (callee.getKind() === SyntaxKind.Identifier) {
    return asyncNames.has((callee as Identifier).getText());
  }
  return false;
}

/**
 * Phase / Rule Category: async
 * Unhandled Promise: 파일에 정의된 async 함수를 await/void/catch 없이 호출한 문
 */
export const asy003Detector: RuleDetector = {
  ruleId: 'ASY-003', // Unhandled Promise rejection
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];
    const asyncNames = collectAsyncCallableNames(sourceFile);

    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.ExpressionStatement) return;
      const es = node as ExpressionStatement;
      let expr = es.getExpression();
      if (expr.getKind() === SyntaxKind.VoidExpression) return;
      if (expr.getKind() === SyntaxKind.AwaitExpression) return;
      if (isFloatingAsyncCall(expr, asyncNames)) {
        findings.push({
          line: es.getStartLineNumber(),
          message:
            'async 함수를 await·void·.catch 없이 호출했습니다 (ASY-003). Promise rejection이 처리되지 않을 수 있습니다.',
        });
      }
    });

    return findings;
  },
};
