import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: complexity
 * Severity: high | Confidence: high
 */
export const cmx007Detector: RuleDetector = {
  ruleId: 'CMX-007', // 중첩 깊이 5단 초과
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 중첩 깊이 5단 초과
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '중첩 깊이 5단 초과 위반' });
      // }
    });
    */

    return findings;
  }
};
