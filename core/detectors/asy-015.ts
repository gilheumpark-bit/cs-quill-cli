import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: async
 * Severity: critical | Confidence: low
 */
export const asy015Detector: RuleDetector = {
  ruleId: 'ASY-015', // race condition — 공유 상태
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for race condition — 공유 상태
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'race condition — 공유 상태 위반' });
      // }
    });
    */

    return findings;
  }
};
