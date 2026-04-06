import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: type
 */
export const typ001Detector: RuleDetector = {
  ruleId: 'TYP-001', // any 타입 무분별 사용
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.AnyKeyword) {
        findings.push({ line: node.getStartLineNumber(), message: 'any 타입 무분별 사용 위반' });
      }
    });
    return findings;
  }
};
