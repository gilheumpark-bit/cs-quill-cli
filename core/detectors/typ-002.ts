import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

function checkFunctionLike(
  findings: Array<{ line: number; message: string }>,
  fn: { getReturnTypeNode(): import('ts-morph').TypeNode | undefined; getStartLineNumber(): number; getKind(): SyntaxKind; getName?: () => string | undefined },
) {
  if (fn.getKind() === SyntaxKind.MethodDeclaration) {
    const n = (fn as { getName?: () => string }).getName?.();
    if (n === 'constructor') return;
  }
  if (!fn.getReturnTypeNode()) {
    findings.push({ line: fn.getStartLineNumber(), message: '함수·메서드 반환 타입 미선언' });
  }
}

/**
 * Phase / Rule Category: type
 */
export const typ002Detector: RuleDetector = {
  ruleId: 'TYP-002', // 함수 반환 타입 미선언
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];

    for (const func of sourceFile.getFunctions()) {
      checkFunctionLike(findings, func);
    }

    for (const cls of sourceFile.getClasses()) {
      for (const method of cls.getMethods()) {
        checkFunctionLike(findings, method);
      }
    }

    for (const decl of sourceFile.getVariableDeclarations()) {
      const init = decl.getInitializer();
      if (!init) continue;
      if (init.getKind() === SyntaxKind.ArrowFunction || init.getKind() === SyntaxKind.FunctionExpression) {
        checkFunctionLike(findings, init as import('ts-morph').ArrowFunction);
      }
    }

    return findings;
  },
};
