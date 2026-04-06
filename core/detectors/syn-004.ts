import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: syntax
 * Severity: low | Confidence: high
 */
export const syn004Detector: RuleDetector = {
  ruleId: 'SYN-004', // 세미콜론 누락
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 세미콜론 누락
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '세미콜론 누락 위반' });
      // }
    });
    */

    return findings;
  }
};
