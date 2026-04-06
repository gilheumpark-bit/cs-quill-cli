import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: complexity
 * Severity: medium | Confidence: low
 */
export const cmx014Detector: RuleDetector = {
  ruleId: 'CMX-014', // 동일 로직 3회+ 복붙
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 동일 로직 3회+ 복붙
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '동일 로직 3회+ 복붙 위반' });
      // }
    });
    */

    return findings;
  }
};
