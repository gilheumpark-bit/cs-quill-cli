import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: type
 */
export const typ004Detector: RuleDetector = {
  ruleId: 'TYP-004', // ! non-null assertion 과용
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.NonNullExpression) {
        findings.push({ line: node.getStartLineNumber(), message: '! non-null assertion 과용 위반' });
      }
    });
    return findings;
  }
};
