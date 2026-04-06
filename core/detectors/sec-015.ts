import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: security
 * Severity: high | Confidence: high
 */
export const sec015Detector: RuleDetector = {
  ruleId: 'SEC-015', // httpOnly/secure 미설정
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for httpOnly/secure 미설정
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'httpOnly/secure 미설정 위반' });
      // }
    });
    */

    return findings;
  }
};
