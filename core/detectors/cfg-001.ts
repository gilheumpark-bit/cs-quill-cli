import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: config
 * Severity: high | Confidence: high
 */
export const cfg001Detector: RuleDetector = {
  ruleId: 'CFG-001', // strict: false
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for strict: false
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'strict: false 위반' });
      // }
    });
    */

    return findings;
  }
};
