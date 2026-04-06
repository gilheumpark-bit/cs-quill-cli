import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: async
 * Severity: high | Confidence: medium
 */
export const asy009Detector: RuleDetector = {
  ruleId: 'ASY-009', // event listener 제거 누락
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for event listener 제거 누락
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'event listener 제거 누락 위반' });
      // }
    });
    */

    return findings;
  }
};
