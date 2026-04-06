import { RuleDetector } from '../detector-registry';
import { SyntaxKind, Node } from 'ts-morph';

function isInsideLoop(node: Node): boolean {
  let parent = node.getParent();
  while (parent) {
    const kind = parent.getKind();
    if (kind === SyntaxKind.ForStatement || kind === SyntaxKind.ForInStatement ||
        kind === SyntaxKind.ForOfStatement || kind === SyntaxKind.WhileStatement ||
        kind === SyntaxKind.DoStatement) {
      return true;
    }
    if (kind === SyntaxKind.CallExpression) {
      const callText = parent.getChildAtIndex(0)?.getText() ?? '';
      if (/\.(forEach|map|reduce|filter|flatMap)\s*$/.test(callText)) return true;
    }
    parent = parent.getParent();
  }
  return false;
}

export const prf008Detector: RuleDetector = {
  ruleId: 'PRF-008',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];

    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.NewExpression) {
        const text = node.getText();
        if (text.startsWith('new RegExp') && isInsideLoop(node)) {
          findings.push({
            line: node.getStartLineNumber(),
            message: '루프 내에서 new RegExp()를 매번 생성하고 있습니다. 루프 밖에서 정규식을 미리 컴파일하세요.',
          });
        }
      }
      // Also catch regex literals inside loops
      if (node.getKind() === SyntaxKind.RegularExpressionLiteral && isInsideLoop(node)) {
        // Only flag if the regex is part of a .match/.test/.replace call inside the loop body
        const parent = node.getParent();
        if (parent && parent.getKind() === SyntaxKind.CallExpression) {
          findings.push({
            line: node.getStartLineNumber(),
            message: '루프 내에서 정규식 리터럴이 매 반복마다 재생성됩니다. 루프 밖에서 변수로 캐싱하세요.',
          });
        }
      }
    });

    return findings;
  }
};
