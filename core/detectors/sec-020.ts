import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: security
 * Severity: high | Confidence: high
 */
export const sec020Detector: RuleDetector = {
  ruleId: 'SEC-020', // HTTP 비암호화 통신
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for HTTP 비암호화 통신
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'HTTP 비암호화 통신 위반' });
      // }
    });
    */

    return findings;
  }
};
