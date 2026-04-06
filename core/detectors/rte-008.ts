import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: runtime
 * Severity: high | Confidence: high
 */
export const rte008Detector: RuleDetector = {
  ruleId: 'RTE-008', // JSON.parse try-catch 없음
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for JSON.parse try-catch 없음
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'JSON.parse try-catch 없음 위반' });
      // }
    });
    */

    return findings;
  }
};
