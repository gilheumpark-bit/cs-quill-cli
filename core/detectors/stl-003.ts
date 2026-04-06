import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

const BOOLEAN_PREFIXES = /^(is|has|can|should|will|did|was|are|need|allow|enable|disable|show|hide|include|exclude|with|without|use)/i;

export const stl003Detector: RuleDetector = {
  ruleId: 'STL-003',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];

    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.VariableDeclaration) {
        const nameNode = node.getChildAtIndex(0);
        if (!nameNode) return;
        const name = nameNode.getText();
        if (name.length <= 2) return;

        // Check if the type is boolean
        const typeNode = node.getChildrenOfKind(SyntaxKind.TypeReference)[0] ??
                         node.getChildrenOfKind(SyntaxKind.BooleanKeyword)[0];
        const initNode = node.getChildAtIndex(node.getChildCount() - 1);
        const initText = initNode?.getText() ?? '';

        const isBoolType = typeNode?.getText() === 'boolean' ||
                           node.getText().includes(': boolean') ||
                           initText === 'true' || initText === 'false' ||
                           initText.startsWith('!') ||
                           /===|!==|>|<|>=|<=|&&|\|\|/.test(initText);

        if (isBoolType && !BOOLEAN_PREFIXES.test(name)) {
          findings.push({
            line: node.getStartLineNumber(),
            message: `boolean 변수 '${name}'에 is/has/can 등의 접두사가 없습니다. boolean임을 명확히 나타내는 이름을 사용하세요.`,
          });
        }
      }
    });

    return findings;
  }
};
