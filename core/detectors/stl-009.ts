import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: style
 * Severity: info | Confidence: high
 */
export const stl009Detector: RuleDetector = {
  ruleId: 'STL-009', // quote style 불일치
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for quote style 불일치
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'quote style 불일치 위반' });
      // }
    });
    */

    return findings;
  }
};
