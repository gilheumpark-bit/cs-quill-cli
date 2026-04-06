import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: runtime
 * Severity: medium | Confidence: medium
 */
export const rte004Detector: RuleDetector = {
  ruleId: 'RTE-004', // nullish ?? 대신 || 오사용
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for nullish ?? 대신 || 오사용
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: 'nullish ?? 대신 || 오사용 위반' });
      // }
    });
    */

    return findings;
  }
};
