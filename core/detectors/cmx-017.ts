import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * CMX-017: Long Parameter List 7+
 * Detects functions/methods with 7 or more parameters.
 * Similar to CMX-002 but with a higher threshold for stricter cases.
 */
export const cmx017Detector: RuleDetector = {
  ruleId: 'CMX-017',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const MAX_PARAMS = 7;

    sourceFile.forEachDescendant(node => {
      const kind = node.getKind();
      if (
        kind === SyntaxKind.FunctionDeclaration ||
        kind === SyntaxKind.MethodDeclaration ||
        kind === SyntaxKind.ArrowFunction ||
        kind === SyntaxKind.FunctionExpression ||
        kind === SyntaxKind.Constructor
      ) {
        const params = (node as any).getParameters?.();
        if (params && params.length >= MAX_PARAMS) {
          const name = (node as any).getName?.() ?? '(anonymous)';
          findings.push({
            line: node.getStartLineNumber(),
            message: `함수 '${name}'의 파라미터가 ${params.length}개로 Long Parameter List (${MAX_PARAMS}개+) 에 해당합니다.`,
          });
        }
      }
    });

    return findings;
  },
};
