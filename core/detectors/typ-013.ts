import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: type
 * Severity: high | Confidence: high
 */
export const typ013Detector: RuleDetector = {
  ruleId: 'TYP-013', // noImplicitAny 위반
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for noImplicitAny 위반
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'noImplicitAny 위반 위반' });
      // }
    });
    */

    return findings;
  }
};
