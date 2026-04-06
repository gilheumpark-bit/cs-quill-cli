import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: config
 * Severity: medium | Confidence: high
 */
export const cfg002Detector: RuleDetector = {
  ruleId: 'CFG-002', // noUnusedLocals: false
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for noUnusedLocals: false
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'noUnusedLocals: false 위반' });
      // }
    });
    */

    return findings;
  }
};
