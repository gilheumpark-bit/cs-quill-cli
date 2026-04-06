import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: type
 * Severity: medium | Confidence: high
 */
export const typ002Detector: RuleDetector = {
  ruleId: 'TYP-002', // 함수 반환 타입 미선언
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 함수 반환 타입 미선언
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '함수 반환 타입 미선언 위반' });
      // }
    });
    */

    return findings;
  }
};
