import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: variable
 * Severity: low | Confidence: high
 */
export const var008Detector: RuleDetector = {
  ruleId: 'VAR-008', // 재할당 불필요 let → const
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for 재할당 불필요 let → const
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '재할당 불필요 let → const 위반' });
      // }
    });
    */

    return findings;
  }
};
