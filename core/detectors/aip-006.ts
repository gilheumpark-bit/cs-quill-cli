import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: ai-pattern
 * Severity: medium | Confidence: low
 */
export const aip006Detector: RuleDetector = {
  ruleId: 'AIP-006', // Vanilla Style — 라이브러리 대신 직접 구현
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for Vanilla Style — 라이브러리 대신 직접 구현
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'Vanilla Style — 라이브러리 대신 직접 구현 위반' });
      // }
    });
    */

    return findings;
  }
};
