import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: style
 * Severity: low | Confidence: low
 */
export const stl007Detector: RuleDetector = {
  ruleId: 'STL-007', // 주석 vs 코드 불일치
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 주석 vs 코드 불일치
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '주석 vs 코드 불일치 위반' });
      // }
    });
    */

    return findings;
  }
};
