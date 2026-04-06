import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: config
 * Severity: high | Confidence: medium
 */
export const cfg006Detector: RuleDetector = {
  ruleId: 'CFG-006', // paths alias 불일치
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for paths alias 불일치
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'paths alias 불일치 위반' });
      // }
    });
    */

    return findings;
  }
};
