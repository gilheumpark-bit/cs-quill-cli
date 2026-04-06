import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

// Single-character variable names that cause confusion (excluding common idioms like i, j, k, _, e, x, y)
const ALLOWED_SINGLE_CHARS = new Set(['i', 'j', 'k', 'n', 'x', 'y', 'z', '_', 'e', 't', 'v']);

export const stl001Detector: RuleDetector = {
  ruleId: 'STL-001',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];

    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.VariableDeclaration) {
        const name = node.getChildAtIndex(0)?.getText() ?? '';
        if (name.length === 1 && !ALLOWED_SINGLE_CHARS.has(name)) {
          // Skip loop variables (for let i)
          const parent = node.getParent()?.getParent();
          if (parent && parent.getKind() === SyntaxKind.ForStatement) return;

          findings.push({
            line: node.getStartLineNumber(),
            message: `단일 문자 변수명 '${name}'은 가독성을 해칩니다. 의미 있는 이름을 사용하세요.`,
          });
        }
      }

      if (node.getKind() === SyntaxKind.Parameter) {
        const name = node.getChildAtIndex(0)?.getText() ?? '';
        if (name.length === 1 && !ALLOWED_SINGLE_CHARS.has(name)) {
          findings.push({
            line: node.getStartLineNumber(),
            message: `단일 문자 매개변수 '${name}'은 가독성을 해칩니다. 의미 있는 이름을 사용하세요.`,
          });
        }
      }
    });

    return findings;
  }
};
