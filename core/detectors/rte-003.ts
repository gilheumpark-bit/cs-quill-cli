import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: runtime
 * Severity: high | Confidence: medium
 */
export const rte003Detector: RuleDetector = {
  ruleId: 'RTE-003', // optional chaining 미사용 직접 접근
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for optional chaining 미사용 직접 접근
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'optional chaining 미사용 직접 접근 위반' });
      // }
    });
    */

    return findings;
  }
};
