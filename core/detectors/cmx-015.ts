import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * CMX-015: 매직 넘버
 * Detects numeric literals used outside of variable/constant declarations,
 * enum members, default parameter values, and common harmless values (0, 1, -1, 2).
 */
export const cmx015Detector: RuleDetector = {
  ruleId: 'CMX-015',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const ALLOWED = new Set([0, 1, -1, 2, 100]);

    sourceFile.forEachDescendant(node => {
      if (node.getKind() !== SyntaxKind.NumericLiteral) return;

      const value = Number(node.getText());
      if (ALLOWED.has(value)) return;

      // Skip if parent is a variable declaration initializer, enum member, or default value
      const parent = node.getParent();
      if (!parent) return;
      const parentKind = parent.getKind();
      if (
        parentKind === SyntaxKind.VariableDeclaration ||
        parentKind === SyntaxKind.EnumMember ||
        parentKind === SyntaxKind.Parameter ||
        parentKind === SyntaxKind.PropertyDeclaration
      ) {
        return;
      }

      // Skip array index access like arr[0]
      if (parentKind === SyntaxKind.ElementAccessExpression) return;

      findings.push({
        line: node.getStartLineNumber(),
        message: `매직 넘버 ${node.getText()} 발견. 명명된 상수로 추출을 권장합니다.`,
      });
    });

    return findings;
  },
};
