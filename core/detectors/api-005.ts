import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: api-misuse
 * Severity: medium | Confidence: medium
 */
export const api005Detector: RuleDetector = {
  ruleId: 'API-005', // localStorage 동기 차단 대용량
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for localStorage 동기 차단 대용량
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'localStorage 동기 차단 대용량 위반' });
      // }
    });
    */

    return findings;
  }
};
