import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: runtime
 * Severity: critical | Confidence: medium
 */
export const rte011Detector: RuleDetector = {
  ruleId: 'RTE-011', // 무한 루프
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 무한 루프
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '무한 루프 위반' });
      // }
    });
    */

    return findings;
  }
};
