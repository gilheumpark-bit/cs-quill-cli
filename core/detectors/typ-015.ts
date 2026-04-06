import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: type
 */
export const typ015Detector: RuleDetector = {
  ruleId: 'TYP-015', // optional chaining 과용
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // 한 표현식 내 optional chaining 개수 체크
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.ExpressionStatement || node.getKind() === SyntaxKind.VariableDeclaration) {
        const text = node.getText();
        const matches = text.match(/\?\./g);
        if (matches && matches.length > 3) {
          findings.push({ line: node.getStartLineNumber(), message: 'optional chaining 과용 위반 (>3)' });
        }
      }
    });
    return findings;
  }
};
