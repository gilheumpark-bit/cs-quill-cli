import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: syntax
 * Severity: medium | Confidence: high
 */
export const syn006Detector: RuleDetector = {
  ruleId: 'SYN-006', // 잘못된 Unicode escape
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 잘못된 Unicode escape
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '잘못된 Unicode escape 위반' });
      // }
    });
    */

    return findings;
  }
};
