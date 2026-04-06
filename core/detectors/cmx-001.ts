import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: complexity
 * Severity: medium | Confidence: high
 */
export const cmx001Detector: RuleDetector = {
  ruleId: 'CMX-001', // 함수 50줄 초과
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 함수 50줄 초과
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '함수 50줄 초과 위반' });
      // }
    });
    */

    return findings;
  }
};
