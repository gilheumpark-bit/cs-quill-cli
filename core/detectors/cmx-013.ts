import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: complexity
 * Severity: low | Confidence: high
 */
export const cmx013Detector: RuleDetector = {
  ruleId: 'CMX-013', // 줄 120자 초과
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 줄 120자 초과
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '줄 120자 초과 위반' });
      // }
    });
    */

    return findings;
  }
};
