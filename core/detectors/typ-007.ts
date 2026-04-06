import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: type
 * Severity: high | Confidence: high
 */
export const typ007Detector: RuleDetector = {
  ruleId: 'TYP-007', // never 타입을 값으로 반환
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for never 타입을 값으로 반환
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'never 타입을 값으로 반환 위반' });
      // }
    });
    */

    return findings;
  }
};
