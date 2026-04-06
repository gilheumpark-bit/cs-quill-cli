import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

function checkNeverBody(
  findings: Array<{ line: number; message: string }>,
  fn: { getReturnTypeNode(): import('ts-morph').TypeNode | undefined; getBody(): import('ts-morph').Node | undefined; getStartLineNumber(): number },
) {
  const ret = fn.getReturnTypeNode();
  if (!ret || ret.getKind() !== SyntaxKind.NeverKeyword) return;
  const body = fn.getBody();
  if (!body || body.getKind() !== SyntaxKind.Block) return;
  const block = body as import('ts-morph').Block;
  for (const st of block.getStatements()) {
    if (st.getKind() !== SyntaxKind.ReturnStatement) continue;
    const rs = st as import('ts-morph').ReturnStatement;
    const ex = rs.getExpression();
    if (ex) {
      findings.push({
        line: ex.getStartLineNumber(),
        message: 'never 반환 함수에서 값을 반환함',
      });
    }
  }
}

/**
 * Phase / Rule Category: type
 */
export const typ007Detector: RuleDetector = {
  ruleId: 'TYP-007', // never 타입을 값으로 반환
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];

    for (const func of sourceFile.getFunctions()) {
      checkNeverBody(findings, func);
    }
    for (const cls of sourceFile.getClasses()) {
      for (const method of cls.getMethods()) {
        if (method.getName() === 'constructor') continue;
        checkNeverBody(findings, method);
      }
    }
    for (const decl of sourceFile.getVariableDeclarations()) {
      const init = decl.getInitializer();
      if (!init) continue;
      if (init.getKind() === SyntaxKind.ArrowFunction || init.getKind() === SyntaxKind.FunctionExpression) {
        checkNeverBody(findings, init as import('ts-morph').ArrowFunction);
      }
    }

    return findings;
  },
};
