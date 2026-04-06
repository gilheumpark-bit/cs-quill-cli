import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: variable
 * Severity: low | Confidence: high
 */
export const var006Detector: RuleDetector = {
  ruleId: 'VAR-006', // 미사용 파라미터
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 미사용 파라미터
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '미사용 파라미터 위반' });
      // }
    });
    */

    return findings;
  }
};
