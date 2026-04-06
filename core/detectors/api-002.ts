import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: api-misuse
 * Severity: medium | Confidence: high
 */
export const api002Detector: RuleDetector = {
  ruleId: 'API-002', // deprecated API 사용
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for deprecated API 사용
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'deprecated API 사용 위반' });
      // }
    });
    */

    return findings;
  }
};
