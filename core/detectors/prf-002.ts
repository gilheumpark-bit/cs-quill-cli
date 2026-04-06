import { RuleDetector } from '../detector-registry';
import { SyntaxKind, Node } from 'ts-morph';

const LINEAR_SEARCH = ['find', 'findIndex', 'indexOf', 'includes', 'some', 'filter'];

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

export const prf002Detector: RuleDetector = {
  ruleId: 'PRF-002',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];

    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.PropertyAccessExpression) {
        const propName = node.getText().split('.').pop() ?? '';
        if (LINEAR_SEARCH.includes(propName) && isInsideLoop(node)) {
          const callParent = node.getParent();
          if (callParent && callParent.getKind() === SyntaxKind.CallExpression) {
            findings.push({
              line: node.getStartLineNumber(),
              message: `루프 내에서 .${propName}() 선형 탐색을 사용하여 O(n\u00B2) 복잡도가 발생합니다. Map 또는 Set 사용을 고려하세요.`,
            });
          }
        }
      }
    });

    return findings;
  }
};
