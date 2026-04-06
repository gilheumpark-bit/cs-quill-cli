import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: async
 * Severity: medium | Confidence: medium
 */
export const asy010Detector: RuleDetector = {
  ruleId: 'ASY-010', // event listener 중복 등록
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for event listener 중복 등록
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'event listener 중복 등록 위반' });
      // }
    });
    */

    return findings;
  }
};
