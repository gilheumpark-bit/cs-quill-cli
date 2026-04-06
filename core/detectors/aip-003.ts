import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: ai-pattern
 * Severity: low | Confidence: low
 */
export const aip003Detector: RuleDetector = {
  ruleId: 'AIP-003', // 엣지 케이스 과잉 명세
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 엣지 케이스 과잉 명세
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '엣지 케이스 과잉 명세 위반' });
      // }
    });
    */

    return findings;
  }
};
