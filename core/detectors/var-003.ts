import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: variable
 * Severity: high | Confidence: high
 */
export const var003Detector: RuleDetector = {
  ruleId: 'VAR-003', // 미선언 전역 변수
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 미선언 전역 변수
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '미선언 전역 변수 위반' });
      // }
    });
    */

    return findings;
  }
};
