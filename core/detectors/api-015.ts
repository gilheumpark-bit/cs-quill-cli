import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: api-misuse
 * Severity: low | Confidence: low
 */
export const api015Detector: RuleDetector = {
  ruleId: 'API-015', // Symbol 대신 문자열 키
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for Symbol 대신 문자열 키
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'Symbol 대신 문자열 키 위반' });
      // }
    });
    */

    return findings;
  }
};
