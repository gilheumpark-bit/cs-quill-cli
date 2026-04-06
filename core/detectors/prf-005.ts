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

const EXPENSIVE_CALLS = ['sort', 'reverse', 'slice', 'concat', 'JSON.parse', 'JSON.stringify',
  'structuredClone', 'Object.keys', 'Object.values', 'Object.entries'];

export const prf005Detector: RuleDetector = {
  ruleId: 'PRF-005',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];

    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.CallExpression && isInsideLoop(node)) {
        const text = node.getText();
        for (const call of EXPENSIVE_CALLS) {
          if (text.includes(call)) {
            findings.push({
              line: node.getStartLineNumber(),
              message: `루프 내에서 비용이 높은 연산(${call})을 반복 호출하고 있습니다. 메모이제이션 또는 루프 밖으로 이동을 고려하세요.`,
            });
            break;
          }
        }
      }
    });

    return findings;
  }
};
