import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: style
 * Severity: info | Confidence: high
 */
export const stl004Detector: RuleDetector = {
  ruleId: 'STL-004', // 상수 소문자
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 상수 소문자
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '상수 소문자 위반' });
      // }
    });
    */

    return findings;
  }
};
