import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: syntax
 * Severity: high | Confidence: high
 */
export const syn010Detector: RuleDetector = {
  ruleId: 'SYN-010', // JSON-in-JS 파싱 실패
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for JSON-in-JS 파싱 실패
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'JSON-in-JS 파싱 실패 위반' });
      // }
    });
    */

    return findings;
  }
};
