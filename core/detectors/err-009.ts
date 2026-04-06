import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: error-handling
 * Severity: high | Confidence: medium
 */
export const err009Detector: RuleDetector = {
  ruleId: 'ERR-009', // stack trace 사용자 노출
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for stack trace 사용자 노출
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'stack trace 사용자 노출 위반' });
      // }
    });
    */

    return findings;
  }
};
