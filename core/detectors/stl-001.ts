import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: style
 * Severity: medium | Confidence: high
 */
export const stl001Detector: RuleDetector = {
  ruleId: 'STL-001', // 단일 문자 변수명 혼동
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 단일 문자 변수명 혼동
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '단일 문자 변수명 혼동 위반' });
      // }
    });
    */

    return findings;
  }
};
