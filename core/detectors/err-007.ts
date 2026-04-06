import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: error-handling
 * Severity: medium | Confidence: medium
 */
export const err007Detector: RuleDetector = {
  ruleId: 'ERR-007', // 중첩 try-catch 3단+
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 중첩 try-catch 3단+
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '중첩 try-catch 3단+ 위반' });
      // }
    });
    */

    return findings;
  }
};
