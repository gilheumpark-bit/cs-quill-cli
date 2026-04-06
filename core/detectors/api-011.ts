import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: api-misuse
 * Severity: high | Confidence: high
 */
export const api011Detector: RuleDetector = {
  ruleId: 'API-011', // setTimeout 문자열 인자
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for setTimeout 문자열 인자
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'setTimeout 문자열 인자 위반' });
      // }
    });
    */

    return findings;
  }
};
