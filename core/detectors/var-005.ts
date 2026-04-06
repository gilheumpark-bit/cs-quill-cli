import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: variable
 * Severity: medium | Confidence: high
 */
export const var005Detector: RuleDetector = {
  ruleId: 'VAR-005', // 미사용 변수
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 미사용 변수
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '미사용 변수 위반' });
      // }
    });
    */

    return findings;
  }
};
