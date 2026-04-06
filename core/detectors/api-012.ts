import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: api-misuse
 * Severity: medium | Confidence: medium
 */
export const api012Detector: RuleDetector = {
  ruleId: 'API-012', // Array 생성자 숫자 1개
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for Array 생성자 숫자 1개
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'Array 생성자 숫자 1개 위반' });
      // }
    });
    */

    return findings;
  }
};
