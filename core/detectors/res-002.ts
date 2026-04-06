import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: resource
 * Severity: high | Confidence: medium
 */
export const res002Detector: RuleDetector = {
  ruleId: 'RES-002', // DB connection 반환 누락
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for DB connection 반환 누락
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'DB connection 반환 누락 위반' });
      // }
    });
    */

    return findings;
  }
};
