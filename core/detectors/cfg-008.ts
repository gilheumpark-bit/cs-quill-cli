import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: config
 * Severity: medium | Confidence: high
 */
export const cfg008Detector: RuleDetector = {
  ruleId: 'CFG-008', // devDeps vs deps 분류 오류
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for devDeps vs deps 분류 오류
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'devDeps vs deps 분류 오류 위반' });
      // }
    });
    */

    return findings;
  }
};
