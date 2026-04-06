import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: style
 * Severity: info | Confidence: low
 */
export const stl006Detector: RuleDetector = {
  ruleId: 'STL-006', // 과도한 주석 (AI 특성)
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 과도한 주석 (AI 특성)
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '과도한 주석 (AI 특성) 위반' });
      // }
    });
    */

    return findings;
  }
};
