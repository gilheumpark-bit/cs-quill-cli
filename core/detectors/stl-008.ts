import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: style
 * Severity: info | Confidence: high
 */
export const stl008Detector: RuleDetector = {
  ruleId: 'STL-008', // 빈 줄 과다 3줄+
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 빈 줄 과다 3줄+
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '빈 줄 과다 3줄+ 위반' });
      // }
    });
    */

    return findings;
  }
};
