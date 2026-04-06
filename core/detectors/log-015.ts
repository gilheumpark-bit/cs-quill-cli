import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: logic
 * Severity: high | Confidence: medium
 */
export const log015Detector: RuleDetector = {
  ruleId: 'LOG-015', // 문자열 + 숫자 연결 오류
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 문자열 + 숫자 연결 오류
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '문자열 + 숫자 연결 오류 위반' });
      // }
    });
    */

    return findings;
  }
};
