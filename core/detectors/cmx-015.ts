import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: complexity
 * Severity: low | Confidence: medium
 */
export const cmx015Detector: RuleDetector = {
  ruleId: 'CMX-015', // 매직 넘버
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 매직 넘버
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '매직 넘버 위반' });
      // }
    });
    */

    return findings;
  }
};
