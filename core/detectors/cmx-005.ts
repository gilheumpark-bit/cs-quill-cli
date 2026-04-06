import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: complexity
 * Severity: low | Confidence: high
 */
export const cmx005Detector: RuleDetector = {
  ruleId: 'CMX-005', // 클래스 메서드 20개 초과
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 클래스 메서드 20개 초과
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '클래스 메서드 20개 초과 위반' });
      // }
    });
    */

    return findings;
  }
};
