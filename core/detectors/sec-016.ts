import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: security
 * Severity: high | Confidence: high
 */
export const sec016Detector: RuleDetector = {
  ruleId: 'SEC-016', // CORS * 와일드카드
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for CORS * 와일드카드
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'CORS * 와일드카드 위반' });
      // }
    });
    */

    return findings;
  }
};
