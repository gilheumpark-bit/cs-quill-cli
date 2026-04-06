import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: ai-pattern
 * Severity: medium | Confidence: low
 */
export const aip002Detector: RuleDetector = {
  ruleId: 'AIP-002', // 리팩터링 회피 — 중복 구현
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 리팩터링 회피 — 중복 구현
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '리팩터링 회피 — 중복 구현 위반' });
      // }
    });
    */

    return findings;
  }
};
