import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * CMX-016: 매직 문자열 반복
 * Detects string literals (length >= 3, non-import) that appear 3+ times in the file.
 */
export const cmx016Detector: RuleDetector = {
  ruleId: 'CMX-016',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const MIN_OCCURRENCES = 3;
    const MIN_LENGTH = 3;

    const stringMap = new Map<string, number[]>();

    sourceFile.forEachDescendant(node => {
      if (node.getKind() !== SyntaxKind.StringLiteral) return;

      // Skip import declarations
      const parent = node.getParent();
      if (parent?.getKind() === SyntaxKind.ImportDeclaration ||
          parent?.getKind() === SyntaxKind.ImportSpecifier ||
          parent?.getParent()?.getKind() === SyntaxKind.ImportDeclaration) {
        return;
      }

      const text = (node as any).getLiteralValue?.() ?? node.getText().slice(1, -1);
      if (text.length < MIN_LENGTH) return;

      const lines = stringMap.get(text) ?? [];
      lines.push(node.getStartLineNumber());
      stringMap.set(text, lines);
    });

    for (const [str, lines] of stringMap) {
      if (lines.length >= MIN_OCCURRENCES) {
        findings.push({
          line: lines[0],
          message: `문자열 "${str}"이(가) ${lines.length}회 반복됩니다. 상수로 추출을 권장합니다.`,
        });
      }
    }

    return findings;
  },
};
