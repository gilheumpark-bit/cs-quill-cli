import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: logic
 * Severity: medium | Confidence: high
 */
export const log012Detector: RuleDetector = {
  ruleId: 'LOG-012', // .map() 결과 미사용
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for .map() 결과 미사용
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '.map() 결과 미사용 위반' });
      // }
    });
    */

    return findings;
  }
};
