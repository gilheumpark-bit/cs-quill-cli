import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * CMX-002: 파라미터 5개 초과
 * Detects functions/methods with more than 5 parameters.
 */
export const cmx002Detector: RuleDetector = {
  ruleId: 'CMX-002',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const MAX_PARAMS = 5;

    sourceFile.forEachDescendant(node => {
      const kind = node.getKind();
      if (
        kind === SyntaxKind.FunctionDeclaration ||
        kind === SyntaxKind.MethodDeclaration ||
        kind === SyntaxKind.ArrowFunction ||
        kind === SyntaxKind.FunctionExpression
      ) {
        const params = (node as any).getParameters?.();
        if (params && params.length > MAX_PARAMS) {
          const name = (node as any).getName?.() ?? '(anonymous)';
          findings.push({
            line: node.getStartLineNumber(),
            message: `함수 '${name}'의 파라미터가 ${params.length}개로 ${MAX_PARAMS}개 제한을 초과합니다.`,
          });
        }
      }
    });

    return findings;
  },
};
