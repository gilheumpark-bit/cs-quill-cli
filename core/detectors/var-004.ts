import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: variable
 * Severity: medium | Confidence: medium
 */
export const var004Detector: RuleDetector = {
  ruleId: 'VAR-004', // 변수 shadowing
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 변수 shadowing
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '변수 shadowing 위반' });
      // }
    });
    */

    return findings;
  }
};
