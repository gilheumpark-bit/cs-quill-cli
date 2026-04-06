import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: variable
 * Severity: medium | Confidence: medium
 */
export const var002Detector: RuleDetector = {
  ruleId: 'VAR-002', // var 호이스팅 의존
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for var 호이스팅 의존
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'var 호이스팅 의존 위반' });
      // }
    });
    */

    return findings;
  }
};
