import { RuleDetector } from '../detector-registry';
import { SyntaxKind, Node, Block } from 'ts-morph';

/**
 * AIP-012: 불필요한 wrapper function (Unnecessary wrapper function)
 * AI creates wrapper functions that just call another function with the same arguments,
 * adding no value. e.g., function doFoo(x) { return foo(x); }
 */
export const aip012Detector: RuleDetector = {
  ruleId: 'AIP-012',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];

    const allFns = [
      ...sourceFile.getFunctions(),
      ...sourceFile.getClasses().flatMap(c => c.getMethods()),
    ];

    for (const fn of allFns) {
      const body = fn.getBody();
      if (!body || !Node.isBlock(body)) continue;
      const stmts = (body as Block).getStatements();

      // Only look at single-statement function bodies
      if (stmts.length !== 1) continue;
      const stmt = stmts[0];

      // Check: return someFunction(same, params);
      let callText = '';
      if (stmt.getKind() === SyntaxKind.ReturnStatement) {
        const expr = stmt.getDescendantsOfKind(SyntaxKind.CallExpression)[0];
        if (expr) callText = expr.getText();
      } else if (stmt.getKind() === SyntaxKind.ExpressionStatement) {
        const expr = stmt.getDescendantsOfKind(SyntaxKind.CallExpression)[0];
        if (expr) callText = expr.getText();
      } else {
        continue;
      }

      if (!callText) continue;

      // Extract the arguments of the wrapper function
      const params = fn.getParameters().map(p => p.getName());
      if (params.length === 0) continue;

      // Extract the arguments passed to the inner call
      const callArgs = callText.match(/\(([^)]*)\)/)?.[1];
      if (!callArgs) continue;
      const innerArgs = callArgs.split(',').map(a => a.trim());

      // Check if all params are passed through identically
      if (params.length === innerArgs.length && params.every((p, i) => p === innerArgs[i])) {
        const innerFnName = callText.split('(')[0].trim();
        findings.push({
          line: fn.getStartLineNumber(),
          message: `불필요한 wrapper: '${fn.getName() ?? '(anonymous)'}' 은(는) '${innerFnName}'을 동일한 인자로 호출할 뿐 — 직접 참조 권장`,
        });
      }
    }

    return findings;
  }
};
