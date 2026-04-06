import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: ai-pattern
 * Severity: medium | Confidence: low
 */
export const aip009Detector: RuleDetector = {
  ruleId: 'AIP-009', // Copy-paste coupling
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for Copy-paste coupling
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'Copy-paste coupling 위반' });
      // }
    });
    */

    return findings;
  }
};
