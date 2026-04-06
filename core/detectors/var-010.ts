import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: variable
 * Severity: high | Confidence: high
 */
export const var010Detector: RuleDetector = {
  ruleId: 'VAR-010', // 동일 스코프 중복 선언
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 동일 스코프 중복 선언
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '동일 스코프 중복 선언 위반' });
      // }
    });
    */

    return findings;
  }
};
