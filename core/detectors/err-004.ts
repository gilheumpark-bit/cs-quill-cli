import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: error-handling
 * Severity: high | Confidence: medium
 */
export const err004Detector: RuleDetector = {
  ruleId: 'ERR-004', // finally 없이 리소스 미해제
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for finally 없이 리소스 미해제
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'finally 없이 리소스 미해제 위반' });
      // }
    });
    */

    return findings;
  }
};
