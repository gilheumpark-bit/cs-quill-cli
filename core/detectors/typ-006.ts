import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: type
 * Severity: medium | Confidence: high
 */
export const typ006Detector: RuleDetector = {
  ruleId: 'TYP-006', // generics 타입 파라미터 누락
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for generics 타입 파라미터 누락
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'generics 타입 파라미터 누락 위반' });
      // }
    });
    */

    return findings;
  }
};
