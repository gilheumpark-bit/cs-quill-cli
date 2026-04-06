import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: logic
 * Severity: high | Confidence: low
 */
export const log018Detector: RuleDetector = {
  ruleId: 'LOG-018', // timezone 미고려 날짜 연산
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for timezone 미고려 날짜 연산
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'timezone 미고려 날짜 연산 위반' });
      // }
    });
    */

    return findings;
  }
};
