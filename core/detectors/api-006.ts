import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: api-misuse
 * Severity: low | Confidence: high
 */
export const api006Detector: RuleDetector = {
  ruleId: 'API-006', // console.log 프로덕션 잔류
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for console.log 프로덕션 잔류
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'console.log 프로덕션 잔류 위반' });
      // }
    });
    */

    return findings;
  }
};
