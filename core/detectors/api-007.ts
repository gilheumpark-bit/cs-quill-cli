import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: api-misuse
 * Severity: critical | Confidence: high
 */
export const api007Detector: RuleDetector = {
  ruleId: 'API-007', // eval() 사용
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for eval() 사용
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'eval() 사용 위반' });
      // }
    });
    */

    return findings;
  }
};
