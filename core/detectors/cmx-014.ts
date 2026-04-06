import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * CMX-014: 동일 로직 3회+ 복붙
 * Detects duplicated code blocks: function/method bodies with identical normalized text
 * appearing 3 or more times in the same file.
 */
export const cmx014Detector: RuleDetector = {
  ruleId: 'CMX-014',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const MIN_DUPES = 3;
    const MIN_LINES = 3; // ignore trivially short blocks

    const bodyMap = new Map<string, number[]>();

    sourceFile.forEachDescendant(node => {
      const kind = node.getKind();
      if (
        kind === SyntaxKind.FunctionDeclaration ||
        kind === SyntaxKind.MethodDeclaration ||
        kind === SyntaxKind.ArrowFunction ||
        kind === SyntaxKind.FunctionExpression
      ) {
        const body = (node as any).getBody?.();
        if (!body) return;
        const text = body.getText();
        const lineCount = text.split('\n').length;
        if (lineCount < MIN_LINES) return;

        const normalized = text.replace(/\s+/g, ' ').trim();
        const lines = bodyMap.get(normalized) ?? [];
        lines.push(node.getStartLineNumber());
        bodyMap.set(normalized, lines);
      }
    });

    for (const [, lines] of bodyMap) {
      if (lines.length >= MIN_DUPES) {
        findings.push({
          line: lines[0],
          message: `동일한 함수 본문이 ${lines.length}회 반복됩니다 (줄: ${lines.join(', ')}). 공통 함수로 추출을 권장합니다.`,
        });
      }
    }

    return findings;
  },
};
