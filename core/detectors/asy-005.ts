import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: async
 * Severity: low | Confidence: medium
 */
export const asy005Detector: RuleDetector = {
  ruleId: 'ASY-005', // .then() + async/await 혼용
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for .then() + async/await 혼용
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '.then() + async/await 혼용 위반' });
      // }
    });
    */

    return findings;
  }
};
