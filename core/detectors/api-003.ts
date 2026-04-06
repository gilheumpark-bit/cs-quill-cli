import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: api-misuse
 * Severity: high | Confidence: high
 */
export const api003Detector: RuleDetector = {
  ruleId: 'API-003', // Array 메서드 비배열 사용
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for Array 메서드 비배열 사용
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'Array 메서드 비배열 사용 위반' });
      // }
    });
    */

    return findings;
  }
};
