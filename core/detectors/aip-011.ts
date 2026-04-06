import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: ai-pattern
 * Severity: low | Confidence: medium
 */
export const aip011Detector: RuleDetector = {
  ruleId: 'AIP-011', // 구형 패턴 고집
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 구형 패턴 고집
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '구형 패턴 고집 위반' });
      // }
    });
    */

    return findings;
  }
};
