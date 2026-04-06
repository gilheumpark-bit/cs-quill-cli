import { RuleDetector } from '../detector-registry';
import { SyntaxKind, Node } from 'ts-morph';

const DOM_QUERY_METHODS = ['querySelector', 'querySelectorAll', 'getElementById', 'getElementsByClassName', 'getElementsByTagName'];

function isInsideLoop(node: Node): boolean {
  let parent = node.getParent();
  while (parent) {
    const kind = parent.getKind();
    if (kind === SyntaxKind.ForStatement || kind === SyntaxKind.ForInStatement ||
        kind === SyntaxKind.ForOfStatement || kind === SyntaxKind.WhileStatement ||
        kind === SyntaxKind.DoStatement) {
      return true;
    }
    // .forEach / .map / .reduce callback
    if (kind === SyntaxKind.CallExpression) {
      const callText = parent.getChildAtIndex(0)?.getText() ?? '';
      if (/\.(forEach|map|reduce|filter|flatMap)\s*$/.test(callText)) return true;
    }
    parent = parent.getParent();
  }
  return false;
}

export const prf001Detector: RuleDetector = {
  ruleId: 'PRF-001',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];

    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.CallExpression) {
        const text = node.getText();
        for (const method of DOM_QUERY_METHODS) {
          if (text.includes(method) && isInsideLoop(node)) {
            findings.push({
              line: node.getStartLineNumber(),
              message: `루프 내에서 DOM 조회(${method})를 반복 호출하고 있습니다. 루프 밖에서 캐싱하세요.`,
            });
            break;
          }
        }
      }
    });

    return findings;
  }
};
