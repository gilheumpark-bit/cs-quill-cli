import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: variable
 * Severity: critical | Confidence: high
 */
export const var001Detector: RuleDetector = {
  ruleId: 'VAR-001', // let/const TDZ 위반
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for let/const TDZ 위반
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'let/const TDZ 위반 위반' });
      // }
    });
    */

    return findings;
  }
};
