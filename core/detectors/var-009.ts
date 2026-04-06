import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: variable
 * Severity: high | Confidence: high
 */
export const var009Detector: RuleDetector = {
  ruleId: 'VAR-009', // 루프 변수 클로저 캡처 오류
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 루프 변수 클로저 캡처 오류
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '루프 변수 클로저 캡처 오류 위반' });
      // }
    });
    */

    return findings;
  }
};
