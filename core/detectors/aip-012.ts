import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: ai-pattern
 * Severity: info | Confidence: medium
 */
export const aip012Detector: RuleDetector = {
  ruleId: 'AIP-012', // 불필요한 wrapper function
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 불필요한 wrapper function
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '불필요한 wrapper function 위반' });
      // }
    });
    */

    return findings;
  }
};
