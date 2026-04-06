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
      if (/\.(forEach|map|reduce|flatMap)\s*$/.test(callText)) return true;
    }
    parent = parent.getParent();
  }
  return false;
}

export const prf004Detector: RuleDetector = {
  ruleId: 'PRF-004',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];

    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.AwaitExpression && isInsideLoop(node)) {
        findings.push({
          line: node.getStartLineNumber(),
          message: '루프 내에서 await를 사용하고 있습니다. 독립적인 비동기 작업이라면 Promise.all()로 병렬 처리하세요.',
        });
      }
    });

    return findings;
  }
};
