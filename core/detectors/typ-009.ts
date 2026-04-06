import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: type
 * Severity: high | Confidence: high
 */
export const typ009Detector: RuleDetector = {
  ruleId: 'TYP-009', // 함수 오버로드 시그니처 불일치
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 함수 오버로드 시그니처 불일치
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '함수 오버로드 시그니처 불일치 위반' });
      // }
    });
    */

    return findings;
  }
};
