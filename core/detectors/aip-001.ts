import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: ai-pattern
 * Severity: info | Confidence: medium
 */
export const aip001Detector: RuleDetector = {
  ruleId: 'AIP-001', // 과도한 인라인 주석
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 과도한 인라인 주석
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '과도한 인라인 주석 위반' });
      // }
    });
    */

    return findings;
  }
};
