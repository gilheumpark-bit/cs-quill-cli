import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: complexity
 * Severity: low | Confidence: medium
 */
export const cmx016Detector: RuleDetector = {
  ruleId: 'CMX-016', // 매직 문자열 반복
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 매직 문자열 반복
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '매직 문자열 반복 위반' });
      // }
    });
    */

    return findings;
  }
};
