import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: ai-pattern
 * Severity: low | Confidence: low
 */
export const aip007Detector: RuleDetector = {
  ruleId: 'AIP-007', // null 체크 불필요 위치
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for null 체크 불필요 위치
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'null 체크 불필요 위치 위반' });
      // }
    });
    */

    return findings;
  }
};
